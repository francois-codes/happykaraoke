import { config } from '@shared/config'
import { sessionLog } from '@shared/db/schema'
import { differenceInMinutes, formatISO } from 'date-fns'

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

export async function addSessionLog(song: string) {
  const timestamp = formatISO(new Date())

  const { db } = await import('@shared/db')
  const { desc, eq } = await import('drizzle-orm')

  const previousSessionLog = await db
    .select()
    .from(sessionLog)
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

      console.log('update', { result })
      return result
    }
  }

  // we insert a new song record

  const result = await db.insert(sessionLog).values({
    song,
    timestamp
  })

  return result
}

export async function getSessionLogs(date: string) {
  const { db } = await import('@shared/db')
  const { sql } = await import('drizzle-orm')

  const results = await db
    .select()
    .from(sessionLog)
    .where(sql`DATE(${sessionLog.timestamp}) = ${date}`)

  console.log({ results })

  return results
}
