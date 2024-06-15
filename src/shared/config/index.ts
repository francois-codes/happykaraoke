import { homedir } from 'os'

export const config = {
  PORT: 8081,
  ADMIN_PASSWORD: 'Ab=G#',
  DEFAULT_SONGS_FOLDER: `${homedir()}/Desktop/songs`,
  VIEWPORT: {
    // iPad Air dimensions
    width: 820,
    height: 1120
  }
}
