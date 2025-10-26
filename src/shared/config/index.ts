export const config = {
  PORT: 8081,
  ADMIN_PASSWORD: 'Ab=G#',
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
