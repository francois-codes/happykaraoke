export type ScrollDiagnosticLevel = 'info' | 'warn' | 'error'

export type ScrollDiagnosticEntry = {
  readonly level: ScrollDiagnosticLevel
  readonly message: string
  readonly timestamp: string
  readonly context?: Record<string, unknown>
}

export const SCROLL_DIAG_ENABLED_KEY = 'happikaraoke.scrollDiagnostics.enabled'
export const SCROLL_DIAG_VERBOSE_KEY = 'happikaraoke.scrollDiagnostics.verbose'

const MAX_ENTRIES = 2000

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function readScrollDiagnosticsEnabled(): boolean {
  const v = safeLocalStorageGet(SCROLL_DIAG_ENABLED_KEY)
  return v === 'true'
}

export function setScrollDiagnosticsEnabled(enabled: boolean): void {
  safeLocalStorageSet(SCROLL_DIAG_ENABLED_KEY, enabled ? 'true' : 'false')
}

export function readScrollDiagnosticsVerbose(): boolean {
  return safeLocalStorageGet(SCROLL_DIAG_VERBOSE_KEY) === 'true'
}

export function setScrollDiagnosticsVerbose(verbose: boolean): void {
  safeLocalStorageSet(SCROLL_DIAG_VERBOSE_KEY, verbose ? 'true' : 'false')
}

export type ScrollDiagnosticExportMeta = {
  appVersion?: string
  scrollMaster?: boolean
  isAdmin?: boolean
  electron?: boolean
  currentSongId?: string | null
}

export type ScrollDiagnosticExport = {
  meta: {
    exportedAt: string
    appVersion?: string
    userAgent?: string
    scrollMaster?: boolean
    isAdmin?: boolean
    electron?: boolean
    verboseWasEnabled: boolean
    diagnosticsEnabled: boolean
    entriesDropped: number
    currentSongId?: string | null
  }
  entries: ScrollDiagnosticEntry[]
}

class ScrollDiagnosticLog {
  private entries: ScrollDiagnosticEntry[] = []
  private dropped = 0
  /** App’s current song key (e.g. path/id from store); merged into every entry for correlation. */
  private activeSongId: string | null = null

  /** Keep in sync with the song shown in the scroll view (call from scroll hooks when `currentSong` changes). */
  setActiveSong(songId: string | null | undefined) {
    this.activeSongId = songId != null && songId !== '' ? songId : null
  }

  getActiveSong(): string | null {
    return this.activeSongId
  }

  private mergeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    const out: Record<string, unknown> = { ...(context ?? {}) }
    if (this.activeSongId != null) {
      out.song = this.activeSongId
    }
    return Object.keys(out).length > 0 ? out : undefined
  }

  private shouldRecord(level: ScrollDiagnosticLevel): boolean {
    if (!readScrollDiagnosticsEnabled()) return false
    if (level === 'info' && !readScrollDiagnosticsVerbose()) return false
    return true
  }

  private push(level: ScrollDiagnosticLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldRecord(level)) return
    console.log(level, message, context)

    const entry: ScrollDiagnosticEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.mergeContext(context)
    }

    if (this.entries.length >= MAX_ENTRIES) {
      this.entries.shift()
      this.dropped += 1
    }
    this.entries.push(entry)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.push('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.push('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.push('error', message, context)
  }

  exportEntries(): ScrollDiagnosticEntry[] {
    return [...this.entries]
  }

  getDroppedCount(): number {
    return this.dropped
  }

  clear() {
    this.entries = []
    this.dropped = 0
  }

  serialize(extra: ScrollDiagnosticExportMeta = {}): ScrollDiagnosticExport {
    const ua =
      typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
        ? navigator.userAgent
        : undefined

    return {
      meta: {
        exportedAt: new Date().toISOString(),
        appVersion: extra.appVersion,
        userAgent: ua,
        scrollMaster: extra.scrollMaster,
        isAdmin: extra.isAdmin,
        electron: extra.electron,
        verboseWasEnabled: readScrollDiagnosticsVerbose(),
        diagnosticsEnabled: readScrollDiagnosticsEnabled(),
        entriesDropped: this.dropped,
        currentSongId: extra.currentSongId
      },
      entries: this.exportEntries()
    }
  }

  serializeJson(extra: ScrollDiagnosticExportMeta = {}, space?: number): string {
    return JSON.stringify(this.serialize(extra), null, space ?? 0)
  }
}

export const scrollDiagnosticLog = new ScrollDiagnosticLog()
