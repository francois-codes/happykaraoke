import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { formatISO } from 'date-fns'
import type { LiveCandidate, LogLine, Soiree, SoireeKind, SoireePatch, SoireeSong, SoireeSummary } from './soireeFormat'
import { detectLives, isSoireeKind, playedSongs, splitSongName } from './soireeFormat'
import { importIntoJournal, isJournalImported, readJournal } from './journal'
import { config } from '@shared/config'

/**
 * Lives are stored as JSON files in a folder next to the songs folder ("HappiKaraoke lives"),
 * so they live in Dropbox and survive app updates (the app's SQLite database ships inside
 * the app bundle and is replaced by an update). Songs are read from the Dropbox journal.
 */
export const SOIREES_FOLDER_NAME = 'HappiKaraoke lives'
const CURRENT_FILE = '.live-en-cours.json'
const IGNORED_FILE = '.lives-ignores.json'

interface CurrentSoiree {
  startedAt: string
}

export interface NewSoiree {
  title: string
  notes: string
  kind: SoireeKind
}

export function soireesFolder(songsFolder: string): string {
  if (!songsFolder) throw new Error('Choisis d’abord le dossier des chansons.')
  return join(dirname(songsFolder), SOIREES_FOLDER_NAME)
}

function ensureFolder(songsFolder: string): string {
  const folder = soireesFolder(songsFolder)
  mkdirSync(folder, { recursive: true })
  return folder
}

/** Atomic write: temp file then rename. */
function writeJson(path: string, data: unknown): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  renameSync(tmp, path)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSoireeSong(value: unknown): value is SoireeSong {
  return (
    isRecord(value) &&
    typeof value.start === 'string' &&
    typeof value.song === 'string' &&
    typeof value.artist === 'string' &&
    typeof value.title === 'string' &&
    typeof value.played === 'boolean'
  )
}

function toSoiree(value: unknown): Soiree | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.notes !== 'string' ||
    typeof value.startedAt !== 'string' ||
    typeof value.stoppedAt !== 'string' ||
    !Array.isArray(value.songs) ||
    !value.songs.every(isSoireeSong)
  ) {
    return null
  }
  return {
    version: 1,
    id: value.id,
    title: value.title,
    notes: value.notes,
    kind: isSoireeKind(value.kind) ? value.kind : 'live',
    startedAt: value.startedAt,
    stoppedAt: value.stoppedAt,
    songs: value.songs
  }
}

const time = (iso: string): number => new Date(iso).getTime()

/** Start time of the live being recorded, or null. */
export function getCurrentSoiree(songsFolder: string): string | null {
  try {
    const path = join(soireesFolder(songsFolder), CURRENT_FILE)
    if (!existsSync(path)) return null
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    return isRecord(parsed) && typeof parsed.startedAt === 'string' ? parsed.startedAt : null
  } catch {
    return null
  }
}

/** ▶: songs launched from now on belong to the live. Starting twice keeps the first start. */
export function startSoiree(songsFolder: string, now: Date = new Date()): string {
  const existing = getCurrentSoiree(songsFolder)
  if (existing) return existing
  const startedAt = formatISO(now)
  const current: CurrentSoiree = { startedAt }
  writeJson(join(ensureFolder(songsFolder), CURRENT_FILE), current)
  return startedAt
}

/** Forgets the live being recorded without saving it. */
export function cancelSoiree(songsFolder: string): void {
  const path = join(soireesFolder(songsFolder), CURRENT_FILE)
  if (existsSync(path)) unlinkSync(path)
}

async function readDatabaseLog(): Promise<LogLine[]> {
  const { db } = await import('@shared/db')
  const { sessionLog } = await import('@shared/db/schema')
  const { asc } = await import('drizzle-orm')
  const rows = await db.select().from(sessionLog).orderBy(asc(sessionLog.id))
  return rows.map((r) => ({ timestamp: r.timestamp, song: r.song }))
}

/**
 * Every song launched, read from the Dropbox journal (see `journal.ts`), with the
 * 2-minute rule applied. The first call copies the app's database into the journal.
 */
export async function readLog(songsFolder: string): Promise<LogLine[]> {
  const folder = soireesFolder(songsFolder)
  if (!isJournalImported(folder)) importIntoJournal(folder, await readDatabaseLog())
  return readJournal(folder, config.SESSION.MIN_LOG_GAP_MINUTES)
}

function idFor(folder: string, startedAt: string): string {
  const base = `${startedAt.slice(0, 10)}_${startedAt.slice(11, 13)}${startedAt.slice(14, 16)}`
  let id = base
  for (let n = 2; existsSync(join(folder, `${id}.json`)); n++) id = `${base}-${n}`
  return id
}

function saveNew(songsFolder: string, startedAt: string, stoppedAt: string, lines: LogLine[], info: NewSoiree): Soiree {
  const folder = ensureFolder(songsFolder)
  const songs: SoireeSong[] = lines.map((l) => ({ start: l.timestamp, song: l.song, ...splitSongName(l.song), played: true }))
  const soiree: Soiree = {
    version: 1,
    id: idFor(folder, startedAt),
    title: info.title.trim() || 'Live',
    notes: info.notes.trim(),
    kind: isSoireeKind(info.kind) ? info.kind : 'live',
    startedAt,
    stoppedAt,
    songs
  }
  writeJson(join(folder, `${soiree.id}.json`), soiree)
  return soiree
}

/** ■: saves the songs logged since ▶. Returns null when nothing was played. */
export async function stopSoiree(songsFolder: string, info: NewSoiree, now: Date = new Date()): Promise<Soiree | null> {
  const startedAt = getCurrentSoiree(songsFolder)
  if (!startedAt) throw new Error('Aucun live en cours.')
  const from = time(startedAt)
  const to = now.getTime()
  const lines = (await readLog(songsFolder)).filter((l) => time(l.timestamp) >= from && time(l.timestamp) <= to)
  cancelSoiree(songsFolder)
  if (lines.length === 0) return null
  return saveNew(songsFolder, startedAt, formatISO(now), lines, info)
}

/** Typical time between two songs of the group, used as the length of the last song. */
function lastSongMinutes(lines: LogLine[]): number {
  const gaps = lines.slice(1).map((l, i) => (time(l.timestamp) - time(lines[i].timestamp)) / 60000).sort((a, b) => a - b)
  if (gaps.length === 0) return 4
  return Math.min(10, Math.max(2, Math.round(gaps[Math.floor(gaps.length / 2)])))
}

/** Saves a live found afterwards: the songs launched from `from` to `to` (both included). */
export async function createSoireeFromLog(songsFolder: string, from: string, to: string, info: NewSoiree): Promise<Soiree> {
  const [a, b] = [time(from), time(to)].sort((x, y) => x - y)
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Début ou fin invalide.')
  const lines = (await readLog(songsFolder)).filter((l) => time(l.timestamp) >= a && time(l.timestamp) <= b)
  if (lines.length === 0) throw new Error('Aucun morceau dans cet intervalle.')
  const stoppedAt = formatISO(new Date(time(lines[lines.length - 1].timestamp) + lastSongMinutes(lines) * 60000))
  return saveNew(songsFolder, lines[0].timestamp, stoppedAt, lines, info)
}

function readSoireeFile(path: string): Soiree | null {
  try {
    return toSoiree(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

function safeId(id: string): string {
  const clean = basename(String(id))
  if (!/^[\w-]+$/.test(clean)) throw new Error('Live inconnu.')
  return clean
}

export function getSoiree(songsFolder: string, id: string): Soiree {
  const soiree = readSoireeFile(join(soireesFolder(songsFolder), `${safeId(id)}.json`))
  if (!soiree) throw new Error('Live introuvable.')
  return soiree
}

function readAll(songsFolder: string): Soiree[] {
  let folder: string
  try {
    folder = soireesFolder(songsFolder)
  } catch {
    return []
  }
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
    .map((f) => readSoireeFile(join(folder, f)))
    .filter((s): s is Soiree => s !== null)
}

/** All saved lives, newest first. */
export function listSoirees(songsFolder: string): SoireeSummary[] {
  return readAll(songsFolder)
    .map((s) => ({ id: s.id, title: s.title, kind: s.kind, startedAt: s.startedAt, playedCount: playedSongs(s).length }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function updateSoiree(songsFolder: string, id: string, patch: SoireePatch): Soiree {
  const soiree = getSoiree(songsFolder, id)
  if (patch.title !== undefined) soiree.title = patch.title.trim() || 'Live'
  if (patch.notes !== undefined) soiree.notes = patch.notes.trim()
  if (patch.kind !== undefined && isSoireeKind(patch.kind)) soiree.kind = patch.kind
  if (patch.played !== undefined) {
    if (patch.played.length !== soiree.songs.length) throw new Error('Liste des morceaux périmée, recharge le live.')
    soiree.songs.forEach((song, i) => {
      song.played = Boolean(patch.played?.[i])
    })
  }
  writeJson(join(soireesFolder(songsFolder), `${soiree.id}.json`), soiree)
  return soiree
}

/** Deletes a saved live (its songs stay in the app's log and may be proposed again). */
export function deleteSoiree(songsFolder: string, id: string): void {
  const path = join(soireesFolder(songsFolder), `${safeId(id)}.json`)
  if (existsSync(path)) unlinkSync(path)
}

function readIgnored(songsFolder: string): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(soireesFolder(songsFolder), IGNORED_FILE), 'utf8'))
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** "Ignorer": this group (identified by its first song) is never proposed again. */
export function ignoreCandidate(songsFolder: string, from: string): void {
  const ignored = readIgnored(songsFolder)
  if (!ignored.includes(from)) writeJson(join(ensureFolder(songsFolder), IGNORED_FILE), [...ignored, from])
}

/** Groups of the log that look like lives and are neither saved nor ignored, newest first. */
export async function listCandidates(songsFolder: string): Promise<LiveCandidate[]> {
  const saved = readAll(songsFolder).map((s) => {
    const starts = s.songs.map((song) => time(song.start))
    return [Math.min(...starts), Math.max(...starts)]
  })
  const ignored = new Set(readIgnored(songsFolder))
  const current = getCurrentSoiree(songsFolder)
  return detectLives(await readLog(songsFolder))
    .filter((c) => !ignored.has(c.from))
    .filter((c) => !saved.some(([a, b]) => time(c.from) <= b && time(c.to) >= a))
    .filter((c) => !current || time(c.to) < time(current))
    .sort((a, b) => time(b.from) - time(a.from))
}

/** Songs of one day, from 06:00 to 06:00 the next morning (a live ends after midnight). */
export async function logsOfDay(songsFolder: string, day: string): Promise<LogLine[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Date invalide.')
  const start = new Date(`${day}T06:00:00`).getTime()
  const end = start + 24 * 3600000
  return (await readLog(songsFolder)).filter((l) => time(l.timestamp) >= start && time(l.timestamp) < end)
}
