import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sqlite } from '../support/database'
import {
  SOIREES_FOLDER_NAME,
  cancelSoiree,
  createSoireeFromLog,
  getCurrentSoiree,
  getSoiree,
  ignoreCandidate,
  listCandidates,
  listSoirees,
  logsOfDay,
  startSoiree,
  stopSoiree,
  updateSoiree
} from '../../src/shared/lib/data/soirees'
import {
  DATA_KARAOKE_PUBLISHED_FILE,
  dataKaraokeLiveUrl,
  detectLives,
  soireeToWhatsApp,
  splitSongName
} from '../../src/shared/lib/data/soireeFormat'

const live = (title: string, notes = '') => ({ title, notes, kind: 'live' as const })

beforeEach(() => {
  sqlite.exec('DELETE FROM queue; DELETE FROM session_log; DELETE FROM user; DELETE FROM session;')
  sqlite.prepare('INSERT INTO session (id, sessionDate, closed) VALUES (1, ?, 0)').run('2026-11-21T19:00:00+01:00')
})

function songsFolder(): string {
  const root = mkdtempSync(join(tmpdir(), 'soirees-'))
  const folder = join(root, 'songs')
  mkdirSync(folder)
  return folder
}

function log(song: string, timestamp: string): void {
  sqlite.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, 1)').run(song, timestamp)
}

test('only songs launched between ▶ and ■ are saved, next to the songs folder', async () => {
  const folder = songsFolder()
  log('Test - Balance', '2026-11-21T19:30:00+01:00')
  startSoiree(folder, new Date('2026-11-21T20:50:00+01:00'))
  assert.equal(getCurrentSoiree(folder)?.slice(0, 10), '2026-11-21')
  log('Johnny Hallyday - Je te promets', '2026-11-21T20:57:00+01:00')
  log('Jean-Jacques Goldman - Je te donne', '2026-11-21T21:40:00+01:00')
  log('Queen - Don’t Stop Me Now', '2026-11-22T00:59:00+01:00')

  const soiree = await stopSoiree(folder, live('  Anniversaire de Laure ', 'Bilan : top'), new Date('2026-11-22T01:02:00+01:00'))
  assert.ok(soiree)
  assert.equal(soiree.title, 'Anniversaire de Laure')
  assert.deepEqual(soiree.songs.map((s) => s.title), ['Je te promets', 'Je te donne', 'Don’t Stop Me Now'])
  assert.equal(soiree.songs[1].artist, 'Jean-Jacques Goldman')
  assert.equal(getCurrentSoiree(folder), null, '■ ends the soirée')
  assert.ok(existsSync(join(folder, '..', SOIREES_FOLDER_NAME, `${soiree.id}.json`)))
  assert.deepEqual(listSoirees(folder).map((s) => [s.title, s.playedCount]), [['Anniversaire de Laure', 3]])
})

test('unchecked songs leave the WhatsApp setlist and the count', async () => {
  const folder = songsFolder()
  startSoiree(folder, new Date('2026-11-21T20:50:00+01:00'))
  log('Johnny Hallyday - Je te promets', '2026-11-21T20:57:00+01:00')
  log('Dave - Vanina', '2026-11-21T21:49:00+01:00')
  log('Queen - Bohemian Rhapsody', '2026-11-21T21:52:00+01:00')
  const soiree = await stopSoiree(folder, live('Anniv'), new Date('2026-11-22T01:02:00+01:00'))
  assert.ok(soiree)

  const updated = updateSoiree(folder, soiree.id, { played: [true, false, true], notes: 'Super soirée' })
  assert.deepEqual(getSoiree(folder, soiree.id).songs.map((s) => s.played), [true, false, true])
  assert.equal(
    soireeToWhatsApp(updated),
    '🤖🤖 2026-11-21 · Anniv - Timelapse 04h05, 2 morceaux 🤖🤖\n' +
      '• 20:57 Johnny Hallyday : Je te promets\n' +
      '• 21:52 Queen : Bohemian Rhapsody\n\n*Commentaires*\nSuper soirée\n'
  )
  assert.throws(() => updateSoiree(folder, soiree.id, { played: [true] }), /périmée/)
})

test('stopping with nothing played saves nothing; cancel forgets the soirée', async () => {
  const folder = songsFolder()
  startSoiree(folder)
  assert.equal(await stopSoiree(folder, live('Vide')), null)
  assert.deepEqual(listSoirees(folder), [])
  startSoiree(folder)
  cancelSoiree(folder)
  assert.equal(getCurrentSoiree(folder), null)
  await assert.rejects(() => stopSoiree(folder, live('x')), /Aucun live/)
})

test('song names split on the first " - "', () => {
  assert.deepEqual(splitSongName('-M-  - Mama Sam'), { artist: '-M-', title: 'Mama Sam' })
  assert.deepEqual(splitSongName('AC-DC - Back In Black'), { artist: 'AC-DC', title: 'Back In Black' })
  assert.deepEqual(splitSongName('Sans artiste'), { artist: '', title: 'Sans artiste' })
})

test('ids are path-safe', () => {
  const folder = songsFolder()
  assert.throws(() => getSoiree(folder, '../../etc/passwd'), /introuvable|inconnue/)
})

/** n songs every `gap` minutes from `start` (local time, +01:00). */
function serie(start: string, n: number, gap: number, prefix = 'Artiste - Titre'): void {
  const t0 = new Date(start).getTime()
  for (let i = 0; i < n; i++) {
    const d = new Date(t0 + i * gap * 60000)
    const iso = new Date(d.getTime() + 3600000).toISOString().replace('Z', '+01:00').replace(/\.\d{3}/, '')
    log(`${prefix} ${i + 1}`, iso)
  }
}

test('detection: ≥ 10 songs over ≥ 1 h; a pause over 45 min splits; a 30 min pause does not', () => {
  const at = (h: string) => `2026-11-21T${h}:00+01:00`
  const lines = [
    { timestamp: at('15:28'), song: 'Balance' },
    ...Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(new Date(at('21:00')).getTime() + i * 5 * 60000).toISOString(), song: `A - ${i}` })),
    ...Array.from({ length: 6 }, (_, i) => ({ timestamp: new Date(new Date(at('22:25')).getTime() + i * 5 * 60000).toISOString(), song: `B - ${i}` })),
    ...Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(new Date('2026-11-22T10:00:00+01:00').getTime() + i * 60000).toISOString(), song: `C - ${i}` }))
  ]
  const found = detectLives(lines)
  assert.equal(found.length, 1, 'the 12-minute grid-checking burst is too short to be a live')
  assert.equal(found[0].count, 18, '21:00 → 22:50 with a 30 min pause is one live')
})

test('a detected group can be qualified, ignored, or picked by hand; saved lives are not proposed again', async () => {
  const folder = songsFolder()
  serie('2026-11-13T20:51:00Z', 12, 6, 'Lucienne - Titre')
  serie('2026-11-14T21:50:00Z', 15, 5, 'Matelots - Titre')
  serie('2026-11-15T10:00:00Z', 3, 3, 'Grille - Titre')

  const candidates = await listCandidates(folder)
  assert.deepEqual(candidates.map((c) => c.count), [15, 12], 'newest first, the 3 grid checks are left out')

  const saved = await createSoireeFromLog(folder, candidates[0].from, candidates[0].to, { title: 'Matelots', notes: '', kind: 'live' })
  assert.equal(saved.songs.length, 15)
  assert.equal(new Date(saved.stoppedAt).getTime() - new Date(saved.songs[14].start).getTime(), 5 * 60000,
    'the last song lasts the usual gap between songs')
  ignoreCandidate(folder, candidates[1].from)
  assert.deepEqual(await listCandidates(folder), [])

  const day = await logsOfDay(folder, '2026-11-15')
  assert.equal(day.length, 3)
  const repete = await createSoireeFromLog(folder, day[0].timestamp, day[2].timestamp, { title: 'Répète', notes: '', kind: 'repete' })
  assert.equal(repete.kind, 'repete')
  assert.deepEqual(listSoirees(folder).map((s) => [s.title, s.kind]), [['Répète', 'repete'], ['Matelots', 'live']])
  updateSoiree(folder, repete.id, { kind: 'amis' })
  assert.equal(getSoiree(folder, repete.id).kind, 'amis')
})

test('journal: every launch is kept in Dropbox, the 2-minute rule is applied when reading', async () => {
  const { appendJournal, readJournal } = await import('../../src/shared/lib/data/journal')
  const folder = songsFolder()
  const lives = join(folder, '..', SOIREES_FOLDER_NAME)
  appendJournal(lives, { timestamp: '2026-11-21T20:57:00+01:00', song: 'Johnny Hallyday - Je te promets' })
  appendJournal(lives, { timestamp: '2026-11-21T21:01:00+01:00', song: 'Britney Spears - Overprotected' })
  appendJournal(lives, { timestamp: '2026-11-21T21:01:40+01:00', song: 'Mike Oldfield - Moonlight Shadow' })
  appendJournal(lives, { timestamp: '2026-11-21T21:05:00+01:00', song: 'Queen - Bohemian Rhapsody' })
  appendJournal(lives, { timestamp: '2026-11-21T21:05:00+01:00', song: 'Queen - Bohemian Rhapsody' })
  assert.deepEqual(
    readJournal(lives, 2).map((l) => l.song),
    ['Johnny Hallyday - Je te promets', 'Mike Oldfield - Moonlight Shadow', 'Queen - Bohemian Rhapsody'],
    'Overprotected (40 s) is dropped, the duplicate is merged'
  )
})

test('lives read the journal: the database is imported once, then later songs come from the journal only', async () => {
  const { appendJournal } = await import('../../src/shared/lib/data/journal')
  const folder = songsFolder()
  const lives = join(folder, '..', SOIREES_FOLDER_NAME)
  serie('2026-11-13T20:00:00Z', 10, 7, 'Avant - Titre')
  assert.equal((await listCandidates(folder)).length, 1, 'songs of the database are imported into the journal')

  sqlite.exec('DELETE FROM session_log;') // an app update replaces the database
  for (let i = 0; i < 12; i++) {
    const t = new Date(Date.parse('2026-11-20T20:00:00+01:00') + i * 6 * 60000)
    appendJournal(lives, { timestamp: t.toISOString(), song: `Après - Titre ${i}` })
  }
  assert.deepEqual((await listCandidates(folder)).map((c) => c.count), [12, 10], 'nothing is lost after the update')
})

test('launching a song writes it to the Dropbox journal', async () => {
  const { addSessionLog, setSessionConfig } = await import('@shared/lib/session')
  const { readJournal } = await import('../../src/shared/lib/data/journal')
  const folder = songsFolder()
  setSessionConfig({ songsFolder: folder })
  sqlite.exec('UPDATE session SET closed = 0 WHERE id = 1')
  await addSessionLog('Queen - Bohemian Rhapsody')
  const lines = readJournal(join(folder, '..', SOIREES_FOLDER_NAME), 2)
  assert.deepEqual(lines.map((l) => l.song), ['Queen - Bohemian Rhapsody'])
})

test('Data Karaoké status: pending until published, online after, outdated once edited; other kinds stay private', async () => {
  const folder = songsFolder()
  const lives = join(folder, '..', SOIREES_FOLDER_NAME)
  log('Johnny Hallyday - Je te promets', '2026-11-21T20:57:00+01:00')
  log('The Jayhawks - Angelyne', '2026-11-23T20:40:00+01:00')
  startSoiree(folder, new Date('2026-11-21T20:50:00+01:00'))
  const party = await stopSoiree(folder, live('Anniv'), new Date('2026-11-21T23:00:00+01:00'))
  startSoiree(folder, new Date('2026-11-23T20:00:00+01:00'))
  const rehearsal = await stopSoiree(folder, { title: 'Répète', notes: '', kind: 'repete' }, new Date('2026-11-23T22:00:00+01:00'))
  assert.ok(party && rehearsal)
  const status = (): Record<string, string> => Object.fromEntries(listSoirees(folder).map((s) => [s.title, s.web]))

  assert.deepEqual(status(), { Anniv: 'pending', Répète: 'private' }, 'no sync yet')

  const publishedAt = new Date(Date.now() + 60_000)
  writeFileSync(join(lives, DATA_KARAOKE_PUBLISHED_FILE), JSON.stringify({ publishedAt: publishedAt.toISOString(), lives: [party.id] }))
  assert.deepEqual(status(), { Anniv: 'online', Répète: 'private' })

  updateSoiree(folder, party.id, { notes: 'Super soirée' })
  const later = new Date(publishedAt.getTime() + 60_000)
  utimesSync(join(lives, `${party.id}.json`), later, later)
  assert.deepEqual(status(), { Anniv: 'outdated', Répète: 'private' }, 'edited after the publication')

  writeFileSync(join(lives, DATA_KARAOKE_PUBLISHED_FILE), '{ broken')
  assert.equal(status().Anniv, 'pending', 'an unreadable status file is ignored')
  assert.equal(dataKaraokeLiveUrl('2026-11-25_2229'), 'https://claude.ai/artifact/XLE5g6FyfxzzeiPaZSydNz#live-2026-11-25-2229')
})
