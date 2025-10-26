import { type SessionLog } from '@shared/db/schema'
import { Session, SessionConfig, SessionWithCount, getSessionConfig, setSessionConfig } from '@shared/lib/session'
import { socketEmitter } from '@shared/server/socketEmitter'
import { createEndpoint } from '@shared/types/endpoints'

export const fetchSessionConfig = createEndpoint<unknown, SessionConfig>({
  method: 'get',
  url: '/fetch-session',
  handler: (_, res) => {
    res.status(200).json(getSessionConfig())
  }
})

export const setSongsFolder = createEndpoint<{ folder: string }, unknown>({
  method: 'post',
  url: '/set-songs-folder',
  handler: async (req, res) => {
    const { folder } = req.body
    const { setPersistedConfig } = await import('@shared/lib/data/config')
    await setPersistedConfig('song_folder', folder)
    setSessionConfig({ songsFolder: folder })
    socketEmitter.emit('folder:changed')
    res.sendStatus(200)
  }
})

export const fetchAllSessions = createEndpoint<unknown, SessionWithCount[]>({
  method: 'get',
  url: '/fetch-all-sessions',
  handler: async (_, res) => {
    const { getAllSessions } = await import('@shared/lib/session')
    const sessions = await getAllSessions()
    res.status(200).json(sessions)
  }
})

export const fetchSessionLog = createEndpoint<{ sessionId: number }, SessionLog[]>({
  method: 'get',
  url: '/fetch-session-log',
  handler: async (req, res) => {
    const { sessionId } = req.query

    const { getSessionLogsById } = await import('@shared/lib/session')

    const logs = await getSessionLogsById(sessionId)

    res.status(200).json(logs)
  }
})

export const closeSession = createEndpoint<unknown, unknown>({
  method: 'post',
  url: '/close-session',
  handler: async (_, res) => {
    const { closeSession } = await import('@shared/lib/session')
    await closeSession()
    res.sendStatus(200)
  }
})

export const deleteSessionLog = createEndpoint<{ sessionId: number }, unknown>({
  method: 'post',
  url: '/delete-session-log',
  handler: async (req, res) => {
    const { sessionId } = req.body

    const { deleteSessionLog } = await import('@shared/lib/session')

    await deleteSessionLog(sessionId)
    res.sendStatus(200)
  }
})

export const refreshSession = createEndpoint<unknown, Session>({
  method: 'post',
  url: '/refresh-session',
  handler: async (_, res) => {
    const { checkAndRefreshSession } = await import('@shared/lib/session')
    const session = await checkAndRefreshSession()
    res.status(200).json(session)
  }
})
