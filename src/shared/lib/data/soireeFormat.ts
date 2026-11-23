/**
 * Lives (called "soirées" in the code) — pure types, detection and formatting, safe for any bundle.
 * A live is recorded between ▶ and ■, or found afterwards in the song log and qualified by the admin.
 * It is saved as one JSON file per live (see `soirees.ts`), outside the app's database.
 * Only lives of kind `live` count in the official stats.
 */

export type SoireeKind = 'live' | 'repete' | 'amis'

export const SOIREE_KINDS: { value: SoireeKind; label: string }[] = [
  { value: 'live', label: 'Live (stats officielles)' },
  { value: 'repete', label: 'Répète' },
  { value: 'amis', label: 'Entre amis' }
]

export function isSoireeKind(value: unknown): value is SoireeKind {
  return value === 'live' || value === 'repete' || value === 'amis'
}

export function kindLabel(kind: SoireeKind): string {
  return SOIREE_KINDS.find((k) => k.value === kind)?.label ?? kind
}

export interface SoireeSong {
  /** Time the song was launched (ISO 8601 with offset, as stored in the session log). */
  start: string
  /** Song as the app knows it: the file name without `.txt` ("Artist - Title"). */
  song: string
  artist: string
  title: string
  /** False when the admin unchecked it (checked by mistake, not actually played). */
  played: boolean
}

export interface Soiree {
  version: 1
  /** Stable id, also the file name: `yyyy-MM-dd_HHmm` of the start (plus a suffix if needed). */
  id: string
  title: string
  notes: string
  kind: SoireeKind
  startedAt: string
  stoppedAt: string
  songs: SoireeSong[]
}

export interface SoireeSummary {
  id: string
  title: string
  kind: SoireeKind
  startedAt: string
  playedCount: number
}

export interface SoireePatch {
  title?: string
  kind?: SoireeKind
  notes?: string
  /** One flag per song, same order as `songs`. */
  played?: boolean[]
}

/** Splits "Artist - Title" on the first " - " (artists like "Jean-Jacques Goldman" keep their hyphen). */
export function splitSongName(song: string): { artist: string; title: string } {
  const index = song.indexOf(' - ')
  if (index === -1) return { artist: '', title: song.trim() }
  return { artist: song.slice(0, index).trim(), title: song.slice(index + 3).trim() }
}

/** "20:57" from an ISO timestamp, in the timezone it was written with. */
export function clockTime(iso: string): string {
  return iso.slice(11, 16)
}

export function playedSongs(soiree: Soiree): SoireeSong[] {
  return soiree.songs.filter((s) => s.played)
}

/** Duration from the first played song to the stop, as "04h05". */
export function timelapse(soiree: Soiree): string {
  const songs = playedSongs(soiree)
  if (songs.length === 0) return '00h00'
  const minutes = Math.max(
    0,
    Math.round((new Date(soiree.stoppedAt).getTime() - new Date(songs[0].start).getTime()) / 60000)
  )
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  return `${hh}h${mm}`
}

/** Text to paste in WhatsApp: 🤖🤖 header with the title, one line per played song, then the notes under *Commentaires*. */
export function soireeToWhatsApp(soiree: Soiree): string {
  const songs = playedSongs(soiree)
  const date = (songs[0]?.start ?? soiree.startedAt).slice(0, 10)
  const title = soiree.title.trim()
  const header = `🤖🤖 ${date}${title ? ` · ${title}` : ''} - Timelapse ${timelapse(soiree)}, ${songs.length} morceaux 🤖🤖`
  const lines = songs.map((s) => `• ${clockTime(s.start)} ${s.artist ? `${s.artist} : ${s.title}` : s.title}`)
  const notes = soiree.notes.trim()
  return [header, ...lines].join('\n') + (notes ? `\n\n*Commentaires*\n${notes}` : '') + '\n'
}

/** A line of the app's song log. */
export interface LogLine {
  timestamp: string
  song: string
}

/** A group of songs that looks like a live and has not been qualified yet. */
export interface LiveCandidate {
  /** Timestamps of the first and last song of the group. */
  from: string
  to: string
  count: number
}

export const LIVE_RULES = {
  /** A longer pause between two songs splits the group. */
  maxGapMinutes: 45,
  minSongs: 10,
  minMinutes: 60
}

const time = (iso: string): number => new Date(iso).getTime()

/** Groups the song log into likely lives: ≥ 10 songs over ≥ 1 h, no pause longer than 45 min. */
export function detectLives(logs: LogLine[], rules = LIVE_RULES): LiveCandidate[] {
  const sorted = [...logs].sort((a, b) => time(a.timestamp) - time(b.timestamp))
  const groups: LogLine[][] = []
  for (const line of sorted) {
    const group = groups[groups.length - 1]
    const last = group?.[group.length - 1]
    if (last && time(line.timestamp) - time(last.timestamp) <= rules.maxGapMinutes * 60000) group.push(line)
    else groups.push([line])
  }
  return groups
    .filter(
      (g) =>
        g.length >= rules.minSongs &&
        time(g[g.length - 1].timestamp) - time(g[0].timestamp) >= rules.minMinutes * 60000
    )
    .map((g) => ({ from: g[0].timestamp, to: g[g.length - 1].timestamp, count: g.length }))
}
