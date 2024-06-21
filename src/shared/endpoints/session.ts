import { type SessionLog } from '@shared/db/schema'
import { SessionConfig, getSessionConfig, setSessionConfig } from '@shared/lib/session'
import { socketEmitter } from '@shared/server/socketEmitter'
import { ISODate } from '@shared/types'
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

export const fetchSessionLog = createEndpoint<{ date: ISODate }, SessionLog[]>({
  method: 'get',
  url: '/fetch-session-log',
  handler: async (req, res) => {
    const { date } = req.query

    const { getSessionLogs } = await import('@shared/lib/session')

    const logs = await getSessionLogs(date)

    res.status(200).json(logs)
  }
})
