import { SessionConfig, getSessionConfig, setSessionConfig } from '@shared/lib/session'
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
  handler: (req, res) => {
    const { folder } = req.body
    setSessionConfig({ songsFolder: folder })
    socketEmitter.emit('folder:changed')
    res.sendStatus(200)
  }
})
