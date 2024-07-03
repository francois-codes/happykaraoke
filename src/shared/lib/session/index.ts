import { config } from '@shared/config'
import { queue, session, sessionLog, user } from '@shared/db/schema'
import { differenceInMinutes, formatISO } from 'date-fns'
import { inArray } from 'drizzle-orm'

import ip from 'ip'
export interface SessionConfig {
  currentSong?: string
  transpo: number
  songsFolder: string
  hostUrl: string
}

const sessionConfig: SessionConfig = {
  transpo: 0,
  songsFolder: '',
  hostUrl: `http://${ip.address()}:${config.PORT}`
}

export const setSessionConfig = (config: Partial<SessionConfig>) => {
  Object.assign(sessionConfig, config)
}

export const getSessionConfig = () => {
  return sessionConfig
}

export async function startSessionIfNeeded() {
  const { db } = await import('@shared/db')

  const currentSession = await getCurrentSession()

  if (currentSession) return currentSession

  const timestamp = formatISO(new Date())

  const result = await db.insert(session).values({ sessionDate: timestamp, closed: 0 }).returning({
    id: session.id,
    sessionDate: session.sessionDate,
    closed: session.closed
  })

  return result
}

export async function getCurrentSession() {
  const { db } = await import('@shared/db')
  const { eq } = await import('drizzle-orm')

  const [result] = await db.select().from(session).where(eq(session.closed, 0)).limit(1)

  return result
}

export async function closeSession() {
  const { db } = await import('@shared/db')
  const { eq } = await import('drizzle-orm')

  const result = await db
    .update(session)
    .set({ closed: 1 })
    .where(eq(session.closed, 0))
    .returning({ id: session.id })

  const deletedSessionIds = result.map(({ id }) => id)

  await Promise.all([
    db.delete(user).where(inArray(user.sessionId, deletedSessionIds)),
    db.delete(queue).where(inArray(queue.sessionId, deletedSessionIds))
  ])

  return result
}

export async function addSessionLog(song: string) {
  const timestamp = formatISO(new Date())

  const { db } = await import('@shared/db')
  const { desc, eq } = await import('drizzle-orm')

  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('no current session!')
  }

  const previousSessionLog = await db
    .select()
    .from(sessionLog)
    .where(eq(sessionLog.sessionId, currentSession.id))
    .orderBy(desc(sessionLog.id))
    .limit(1)

  const lastLog = previousSessionLog?.[0]

  if (lastLog && lastLog.timestamp) {
    const lastLogDate = new Date(lastLog.timestamp)
    const diff = differenceInMinutes(timestamp, lastLogDate)

    // if last song was played less than 2 minutes ago, update it
    if (diff < 2) {
      const result = await db
        .update(sessionLog)
        .set({
          song,
          timestamp
        })
        .where(eq(sessionLog.id, lastLog.id))

      return result
    }
  }

  // we insert a new song record

  const result = await db.insert(sessionLog).values({
    song,
    timestamp,
    sessionId: currentSession.id
  })

  return result
}

export async function getSessionLogs(date: string) {
  const { db } = await import('@shared/db')
  const { sql, asc, inArray } = await import('drizzle-orm')

  const sessionsOnDate = await db
    .select()
    .from(session)
    .where(sql`DATE(${session.sessionDate}) = ${date}`)

  if (!sessionsOnDate.length) {
    return []
  }

  const results = await db
    .select()
    .from(sessionLog)
    .where(
      inArray(
        sessionLog.sessionId,
        sessionsOnDate.map(({ id }) => id)
      )
    )
    .orderBy(asc(sessionLog.sessionId), asc(sessionLog.id))

  return results
}
