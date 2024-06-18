import { config } from '@shared/config'
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
