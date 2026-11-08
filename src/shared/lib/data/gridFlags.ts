// Default import: the shared folder is also bundled for the browser, where Vite only stubs a default export.
import crypto from 'crypto'
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { GRID_FLAGS_FILE, GRID_FLAGS_TMP } from './gridFlagsFile'

export { GRID_FLAGS_FILE, GRID_FLAGS_FILES } from './gridFlagsFile'

/**
 * "Grilles à corriger": songs the admin flagged while playing (P key).
 * Stored in the songs folder so the grid editor (Claude-grilles) can read it without the app.
 * The app is the only writer. A flag is resolved as soon as the song file content changes
 * (SHA-1 of the file differs from `hash`).
 */
export interface GridFlagSection {
  name: string
  markedAt: string
}

export interface GridFlag {
  /** File name in the songs folder, NFC-normalized, with `.txt`. */
  file: string
  /** Song title as used by the app (file name without `.txt`). */
  title: string
  markedAt: string
  sections: GridFlagSection[]
  /** SHA-1 (hex) of the file content when flagged. */
  hash: string
  note?: string
}

interface GridFlagsDocument {
  version: 1
  flags: GridFlag[]
}

const nfc = (value: string): string => value.normalize('NFC')

export function hashSongContent(content: Buffer | string): string {
  return crypto.createHash('sha1').update(content).digest('hex')
}

/** Finds the on-disk name of a `.txt` file, comparing NFC-normalized names (macOS may store NFD). */
function findOnDisk(folder: string, fileNfc: string): string | null {
  try {
    return readdirSync(folder).find((f) => nfc(f) === fileNfc) ?? null
  } catch {
    return null
  }
}

/** Resolves a song title (as the app knows it) to its file name, like `Song.load()` does. */
export function resolveSongFile(folder: string, title: string): string | null {
  const wanted = nfc(title).trim().toLowerCase()
  try {
    const file = readdirSync(folder).find(
      (f) => f.endsWith('.txt') && nfc(f.replace(/\.txt$/, '')).trim().toLowerCase() === wanted
    )
    return file ? nfc(file) : null
  } catch {
    return null
  }
}

function currentHash(folder: string, file: string): string | null {
  const onDisk = findOnDisk(folder, file)
  if (!onDisk) return null
  try {
    return hashSongContent(readFileSync(join(folder, onDisk)))
  } catch {
    return null
  }
}

function isSection(value: unknown): value is GridFlagSection {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.name === 'string' && typeof v.markedAt === 'string'
}

function isGridFlag(value: unknown): value is GridFlag {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.file === 'string' &&
    typeof v.title === 'string' &&
    typeof v.markedAt === 'string' &&
    typeof v.hash === 'string' &&
    Array.isArray(v.sections) &&
    v.sections.every(isSection) &&
    (v.note === undefined || typeof v.note === 'string')
  )
}

export function readGridFlags(folder: string): GridFlag[] {
  const path = join(folder, GRID_FLAGS_FILE)
  if (!existsSync(path)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const flags = (parsed as { flags?: unknown })?.flags
    return Array.isArray(flags) ? flags.filter(isGridFlag) : []
  } catch {
    return []
  }
}

/** Atomic write: temp file then rename, so the editor never reads a half-written file. */
function writeGridFlags(folder: string, flags: GridFlag[]): void {
  const doc: GridFlagsDocument = { version: 1, flags }
  const tmp = join(folder, GRID_FLAGS_TMP)
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8')
  renameSync(tmp, join(folder, GRID_FLAGS_FILE))
}

export interface AddGridFlagResult {
  flag: GridFlag
  /** Identifies this mark, to undo it. */
  markedAt: string
}

/** Flags a song (or adds a section to its existing flag). Throws if the song file is missing. */
export function addGridFlag(folder: string, title: string, sectionName: string | null, now: Date = new Date()): AddGridFlagResult {
  const file = resolveSongFile(folder, title)
  if (!file) throw new Error(`Grille introuvable : ${title}`)
  const hash = currentHash(folder, file)
  if (!hash) throw new Error(`Grille illisible : ${title}`)

  const markedAt = now.toISOString()
  const section: GridFlagSection = { name: sectionName?.trim() || 'Section inconnue', markedAt }
  const flags = readGridFlags(folder)
  const existing = flags.find((f) => f.file === file && f.hash === hash)
  if (existing) {
    existing.sections.push(section)
    existing.markedAt = markedAt
    writeGridFlags(folder, flags)
    return { flag: existing, markedAt }
  }
  // A flag on an older version of the file is obsolete: replace it.
  const flag: GridFlag = { file, title, markedAt, sections: [section], hash }
  writeGridFlags(folder, [...flags.filter((f) => f.file !== file), flag])
  return { flag, markedAt }
}

/** Undoes one mark; removes the flag when it has no section left. */
export function undoGridFlag(folder: string, file: string, markedAt: string): void {
  const flags = readGridFlags(folder)
  const flag = flags.find((f) => f.file === nfc(file))
  if (!flag) return
  flag.sections = flag.sections.filter((s) => s.markedAt !== markedAt)
  writeGridFlags(folder, flag.sections.length ? flags : flags.filter((f) => f !== flag))
}

export function removeGridFlag(folder: string, file: string): void {
  const flags = readGridFlags(folder)
  const next = flags.filter((f) => f.file !== nfc(file))
  if (next.length !== flags.length) writeGridFlags(folder, next)
}

export function setGridFlagNote(folder: string, file: string, note: string): void {
  const flags = readGridFlags(folder)
  const flag = flags.find((f) => f.file === nfc(file))
  if (!flag) return
  const trimmed = note.trim()
  if (trimmed) flag.note = trimmed
  else delete flag.note
  writeGridFlags(folder, flags)
}

/** Drops flags whose file was changed or deleted since it was flagged. Returns the remaining flags. */
export function pruneGridFlags(folder: string): GridFlag[] {
  const flags = readGridFlags(folder)
  const kept = flags.filter((f) => currentHash(folder, f.file) === f.hash)
  if (kept.length !== flags.length) writeGridFlags(folder, kept)
  return kept
}
