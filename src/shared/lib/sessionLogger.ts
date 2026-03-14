type SessionLogLevel = 'info' | 'warn' | 'error'

type SessionLogEntry = {
  readonly level: SessionLogLevel
  readonly message: string
  readonly timestamp: string
  readonly context?: Record<string, unknown>
}

class SessionLogger {
  private entries: SessionLogEntry[] = []

  log(level: SessionLogLevel, message: string, context?: Record<string, unknown>) {
    const entry: SessionLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    }

    this.entries.push(entry)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }

  export(): SessionLogEntry[] {
    return [...this.entries]
  }

  clear() {
    this.entries = []
  }
}

export const sessionLogger = new SessionLogger()

export type { SessionLogEntry, SessionLogLevel }

