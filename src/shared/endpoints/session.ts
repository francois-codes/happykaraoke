import { SessionConfig, getSessionConfig, setSessionConfig } from '@shared/lib/session'
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
    res.sendStatus(200)
  }
})
