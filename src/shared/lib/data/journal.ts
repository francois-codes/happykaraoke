import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { hostname } from 'os'
import type { LogLine } from './soireeFormat'

/**
 * Journal of every song launched, kept in Dropbox next to the lives
 * ("HappiKaraoke lives/journal"), because the app's SQLite database ships inside the
 * app bundle and is replaced by an update.
 *
 * - Append-only: one JSON line per launch, one file per month and per computer
 *   (`2026-11_<computer>.jsonl`), so two Macs never write the same file through Dropbox.
 * - Nothing is ever deleted: the "2 minutes" rule (a song followed by another one less
 *   than 2 minutes later was not really played) is applied when reading.
 * - The first read imports, once, the songs already in the app's database.
 */
export const JOURNAL_FOLDER = 'journal'
const IMPORT_MARKER = '.import-base-faite'

function computer(): string {
  return (hostname().replace(/\.local$/, '').replace(/[^\w-]+/g, '-') || 'mac').slice(0, 40)
}

function journalFolder(livesFolder: string): string {
  return join(livesFolder, JOURNAL_FOLDER)
}

function isLogLine(value: unknown): value is LogLine {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).timestamp === 'string' &&
    typeof (value as Record<string, unknown>).song === 'string'
  )
}

function appendLines(livesFolder: string, file: string, lines: LogLine[]): void {
  if (lines.length === 0) return
  const folder = journalFolder(livesFolder)
  mkdirSync(folder, { recursive: true })
  appendFileSync(join(folder, file), lines.map((l) => JSON.stringify({ timestamp: l.timestamp, song: l.song }) + '\n').join(''), 'utf8')
}

/** Adds a launched song to the journal. */
export function appendJournal(livesFolder: string, line: LogLine): void {
  appendLines(livesFolder, `${line.timestamp.slice(0, 7)}_${computer()}.jsonl`, [line])
}

/** Copies, once, the songs already in the app's database into the journal. */
export function importIntoJournal(livesFolder: string, lines: LogLine[]): boolean {
  const folder = journalFolder(livesFolder)
  if (existsSync(join(folder, IMPORT_MARKER))) return false
  appendLines(livesFolder, `import-base_${computer()}.jsonl`, lines)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, IMPORT_MARKER), new Date().toISOString() + '\n', 'utf8')
  return true
}

export function isJournalImported(livesFolder: string): boolean {
  return existsSync(join(journalFolder(livesFolder), IMPORT_MARKER))
}

const time = (iso: string): number => new Date(iso).getTime()

/** Drops songs followed by another one less than `minGapMinutes` later (same rule as the session log). */
export function applyMinGap(lines: LogLine[], minGapMinutes: number): LogLine[] {
  return lines.filter((line, i) => {
    const next = lines[i + 1]
    return !next || time(next.timestamp) - time(line.timestamp) >= minGapMinutes * 60000
  })
}

/** Every launch of every computer, sorted, duplicates removed, 2-minute rule applied. */
export function readJournal(livesFolder: string, minGapMinutes: number): LogLine[] {
  const folder = journalFolder(livesFolder)
  if (!existsSync(folder)) return []
  const seen = new Set<string>()
  const lines: LogLine[] = []
  for (const file of readdirSync(folder).filter((f) => f.endsWith('.jsonl'))) {
    for (const raw of readFileSync(join(folder, file), 'utf8').split('\n')) {
      if (!raw.trim()) continue
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!isLogLine(parsed) || Number.isNaN(time(parsed.timestamp))) continue
        const key = `${time(parsed.timestamp)}|${parsed.song}`
        if (seen.has(key)) continue
        seen.add(key)
        lines.push({ timestamp: parsed.timestamp, song: parsed.song })
      } catch {
        // A line cut by a crash or a Dropbox conflict is skipped, the others are kept.
      }
    }
  }
  lines.sort((a, b) => time(a.timestamp) - time(b.timestamp))
  return applyMinGap(lines, minGapMinutes)
}
