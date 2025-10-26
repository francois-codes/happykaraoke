import { config } from '@shared/config'
import { queue, session, sessionLog, user } from '@shared/db/schema'
import { differenceInMinutes, formatISO } from 'date-fns'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { UserType } from '@shared/types'

import ip from 'ip'
export interface SessionConfig {
  currentSong?: string
  transpo: number
  songsFolder: string
  hostUrl: string
}

export interface Session {
  id: number;
  sessionDate: string;
  closed: 0 | 1;
}

export interface SessionWithCount extends Session {
  songCount: number
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

  if (currentSession) {
    // Update any admin users from old sessions to point to current session
    await updateAdminUsersToCurrentSession(currentSession.id)
    return currentSession
  }

  const timestamp = formatISO(new Date())

  const [result] = await db.insert(session).values({ sessionDate: timestamp, closed: 0 }).returning({
    id: session.id,
    sessionDate: session.sessionDate,
    closed: session.closed
  })

  // Update any admin users from old sessions to point to this new session
  await updateAdminUsersToCurrentSession(result.id)

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

  const result = await db
    .update(session)
    .set({ closed: 1 })
    .where(eq(session.closed, 0))
    .returning({ id: session.id })

  const closedSessionIds = result.map(({ id }) => id)

  // Delete guest users and queue items, but keep admin users
  await Promise.all([
    db.delete(user).where(
      and(
        inArray(user.sessionId, closedSessionIds),
        eq(user.type, UserType.GUEST)
      )
    ),
    db.delete(queue).where(inArray(queue.sessionId, closedSessionIds))
  ])

  return result
}

/**
 * Updates all admin users from closed sessions to point to the current open session
 * This ensures admin users persist across session refreshes
 */
async function updateAdminUsersToCurrentSession(currentSessionId: number) {
  const { db } = await import('@shared/db')

  // Get all closed session IDs
  const closedSessions = await db
    .select({ id: session.id })
    .from(session)
    .where(eq(session.closed, 1))

  if (closedSessions.length === 0) {
    return
  }

  const closedSessionIds = closedSessions.map(({ id }) => id)

  // Update admin users from closed sessions to point to current session
  await db
    .update(user)
    .set({ sessionId: currentSessionId })
    .where(
      and(
        inArray(user.sessionId, closedSessionIds),
        eq(user.type, UserType.ADMIN)
      )
    )
}

/**
 * Checks if the current session is still valid
 * Validates based on last activity (either last song log or session creation date)
 * If session is expired (last activity > TIMEOUT_MINUTES ago) or doesn't exist,
 * closes old session and creates a new one
 * Also migrates any admin users from closed sessions to the current session
 * @returns The current valid session
 */
export async function checkAndRefreshSession() {
  const { db } = await import('@shared/db')

  const currentSession = await getCurrentSession()

  // If no session exists, create one (will also migrate admin users)
  if (!currentSession) {
    return await startSessionIfNeeded()
  }

  // Check if session has timed out by looking at last song log
  const lastLog = await db
    .select()
    .from(sessionLog)
    .where(eq(sessionLog.sessionId, currentSession.id))
    .orderBy(desc(sessionLog.id))
    .limit(1)

  const lastLogEntry = lastLog?.[0]

  const now = new Date()
  let minutesSinceActivity: number

  // If no logs exist, check session creation date instead
  if (!lastLogEntry || !lastLogEntry.timestamp) {
    const sessionDate = new Date(currentSession.sessionDate)
    minutesSinceActivity = differenceInMinutes(now, sessionDate)
  } else {
    // Check last log timestamp
    const lastLogDate = new Date(lastLogEntry.timestamp)
    minutesSinceActivity = differenceInMinutes(now, lastLogDate)
  }

  // If session has timed out (either since last log or since creation), close it and create a new one
  if (minutesSinceActivity >= config.SESSION.TIMEOUT_MINUTES) {
    await closeSession()
    return await startSessionIfNeeded()
  }

  // Session is still valid, but still migrate any admin users from old sessions
  await updateAdminUsersToCurrentSession(currentSession.id)
  return currentSession
}

export async function addSessionLog(song: string) {
  const timestamp = formatISO(new Date())

  const { db } = await import('@shared/db')

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
    const diff = differenceInMinutes(new Date(timestamp), lastLogDate)

    // if last song was played less than MIN_LOG_GAP_MINUTES ago, delete it
    if (diff < config.SESSION.MIN_LOG_GAP_MINUTES) {
      await db.delete(sessionLog).where(eq(sessionLog.id, lastLog.id))
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

export async function getAllSessions(): Promise<SessionWithCount[]> {
  const { db } = await import('@shared/db')

  const result = await db
    .select({
      id: session.id,
      sessionDate: session.sessionDate,
      closed: session.closed,
      songCount: count(sessionLog.id)
    })
    .from(session)
    .where(eq(session.closed, 1))
    .innerJoin(sessionLog, eq(session.id, sessionLog.sessionId))
    .groupBy(session.id)

  return result
}

export async function getSessionLogsById(sessionId: number) {
  const { db } = await import('@shared/db')

  const result = await db.select().from(sessionLog).where(eq(sessionLog.sessionId, sessionId))

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

export async function deleteSessionLog(sessionId: number) {
  const { db } = await import('@shared/db')

  const result = await Promise.all([
    db.delete(sessionLog).where(eq(sessionLog.sessionId, sessionId)),
    db.delete(session).where(eq(session.id, sessionId))
  ])

  return result
}
