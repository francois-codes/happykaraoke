#!/usr/bin/env node
/**
 * Builds the data file of the "Data Karaoké" mini-site from the app's lives.
 *
 * Inputs (all in the "HappiKaraoke lives" folder, next to the songs folder in Dropbox):
 *   - <id>.json          one file per live, written by the app (only kind "live" is published)
 *   - catalogue.json     enrichment per song (year, genre, nat, voice, bpm), keyed "artist|title" normalized,
 *                        plus `alias` { "<key of a renamed song>": "<catalogue key>" }
 *   - saisons.json       optional season overrides { "<live id>": "2024" }
 *
 * Output: a JSON file { version, hash, lives: [...] } and, on stdout, a JSON report:
 *   { hash, lives, songs, missing: [{ key, artist, title, lives: [ids] }] }
 * `missing` lists the played songs that have no catalogue entry yet (to enrich, then rebuild).
 * `hash` only changes when the published content changes, so a sync job can skip no-op runs.
 *
 * Usage: node scripts/data-karaoke/build-site-data.mjs "<lives folder>" <out.json> [--mark-published]
 *
 * --mark-published: run once the publication succeeded. Also writes "<lives folder>/.data-karaoke-publie.json"
 *   { publishedAt, hash, lives: [ids] }, which the app reads to show each live as online / to update / pending.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const markPublished = args.includes('--mark-published')
const [livesFolder, outFile] = args.filter((a) => a !== '--mark-published')
if (!livesFolder || !outFile) {
  console.error('Usage: build-site-data.mjs "<lives folder>" <out.json>')
  process.exit(1)
}

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback)

/** Same key as catalogue.json: lowercase, no accents, letters and digits only ("none" for a missing title). */
const norm = (value) =>
  String(value ?? 'none')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
export const songKey = (artist, title) => `${norm(artist)}|${norm(title)}`

const { songs: catalogue, alias = {} } = readJson(join(livesFolder, 'catalogue.json'), { songs: {} })
/** A renamed song file keeps its enrichment through `alias`: { "<new key>": "<catalogue key>" }. */
const canonicalKey = (key) => (alias[key] && catalogue[alias[key]] ? alias[key] : key)
const seasons = readJson(join(livesFolder, 'saisons.json'), {})

/** Evening date: the day of the first played song; before 06:00 it still belongs to the previous evening. */
function eveningDate(iso) {
  const day = iso.slice(0, 10)
  if (Number(iso.slice(11, 13)) >= 6) return day
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Minutes between two ISO timestamps (offsets respected). */
const minutesBetween = (a, b) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))

const missing = new Map()
const lives = []

for (const file of readdirSync(livesFolder).filter((f) => /^\d{4}-\d{2}-\d{2}_\d{4}.*\.json$/.test(f)).sort()) {
  const live = JSON.parse(readFileSync(join(livesFolder, file), 'utf8'))
  if (live.kind !== 'live') continue
  const played = live.songs.filter((s) => s.played)
  if (played.length === 0) continue

  const songs = played.map((s) => {
    const key = canonicalKey(songKey(s.artist, s.title))
    const info = catalogue[key]
    if (!info) {
      const entry = missing.get(key) ?? { key, artist: s.artist, title: s.title, lives: [] }
      if (!entry.lives.includes(live.id)) entry.lives.push(live.id)
      missing.set(key, entry)
    }
    return {
      k: key,
      t: s.start.slice(11, 16),
      // The catalogue holds the official spelling (current song file name); old lives keep old file names.
      a: info?.artist || s.artist || s.song,
      s: (info ? info.title : s.title) ?? '',
      y: info?.year ?? null,
      g: info?.genre ?? null,
      n: info?.nat ?? null,
      v: info?.voice ?? null,
      b: info?.bpm ?? null
    }
  })

  const date = eveningDate(played[0].start)
  lives.push({
    id: live.id,
    title: live.title.trim() || 'Live',
    date,
    season: seasons[live.id] ?? date.slice(0, 4),
    minutes: minutesBetween(played[0].start, live.stoppedAt),
    notes: live.notes.trim(),
    songs
  })
}

lives.sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id))

const hash = createHash('sha256').update(JSON.stringify(lives)).digest('hex').slice(0, 16)
writeFileSync(outFile, JSON.stringify({ version: 1, hash, lives }) + '\n', 'utf8')

if (markPublished) {
  const status = { publishedAt: new Date().toISOString(), hash, lives: lives.map((l) => l.id) }
  const target = join(livesFolder, '.data-karaoke-publie.json')
  writeFileSync(`${target}.tmp`, JSON.stringify(status, null, 2) + '\n', 'utf8')
  renameSync(`${target}.tmp`, target)
}

console.log(
  JSON.stringify(
    {
      hash,
      lives: lives.length,
      songs: lives.reduce((sum, l) => sum + l.songs.length, 0),
      missing: [...missing.values()]
    },
    null,
    2
  )
)
