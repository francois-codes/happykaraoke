export const config = {
  PORT: 8081,
  ADMIN_PASSWORD: 'Ab=G#',
  /** Grid editor (Claude-grilles/editeur) on the host Mac: imports Ultimate Guitar links. */
  GRID_EDITOR_URL: 'http://127.0.0.1:8777',
  VIEWPORT: {
    // iPad Air dimensions
    width: 820,
    height: 1120
  },
  SESSION: {
    // Session timeout in minutes (4 hours)
    TIMEOUT_MINUTES: 240,
    // Minimum time between song logs in minutes (2 minutes)
    // If a song is logged within this time, the previous log is deleted
    MIN_LOG_GAP_MINUTES: 2
  }
}
