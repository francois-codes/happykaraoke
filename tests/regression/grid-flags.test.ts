import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  GRID_FLAGS_FILE,
  addGridFlag,
  hashSongContent,
  pruneGridFlags,
  readGridFlags,
  removeGridFlag,
  setGridFlagNote,
  undoGridFlag
} from '../../src/shared/lib/data/gridFlags'

function songsFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), 'grid-flags-'))
  writeFileSync(join(folder, 'Artiste - Chanson.txt'), 'Chanson\nArtiste\nC\npop\n\n# Couplet\nC G\nla la\n')
  // macOS can store accented names decomposed (NFD).
  writeFileSync(join(folder, 'Calogero - Été'.normalize('NFD') + '.txt'), 'Été\nCalogero\nC\npop\n')
  return folder
}

test('flagging stores song, section and content hash in the shared JSON file', () => {
  const folder = songsFolder()
  const { flag } = addGridFlag(folder, 'Artiste - Chanson', 'Refrain (2e)', new Date('2026-11-08T20:00:00Z'))
  assert.equal(flag.file, 'Artiste - Chanson.txt')
  assert.deepEqual(flag.sections.map((s) => s.name), ['Refrain (2e)'])
  assert.equal(flag.hash, hashSongContent(readFileSync(join(folder, 'Artiste - Chanson.txt'))))
  const raw = JSON.parse(readFileSync(join(folder, GRID_FLAGS_FILE), 'utf8'))
  assert.equal(raw.version, 1)
  assert.equal(raw.flags.length, 1)
})

test('a second mark on the same song adds a section; undo removes only that mark', () => {
  const folder = songsFolder()
  addGridFlag(folder, 'artiste - chanson', 'Couplet', new Date('2026-11-08T20:00:00Z'))
  const second = addGridFlag(folder, 'Artiste - Chanson', 'Pont', new Date('2026-11-08T20:01:00Z'))
  assert.equal(readGridFlags(folder).length, 1)
  assert.deepEqual(readGridFlags(folder)[0].sections.map((s) => s.name), ['Couplet', 'Pont'])
  undoGridFlag(folder, 'Artiste - Chanson.txt', second.markedAt)
  assert.deepEqual(readGridFlags(folder)[0].sections.map((s) => s.name), ['Couplet'])
  undoGridFlag(folder, 'Artiste - Chanson.txt', readGridFlags(folder)[0].sections[0].markedAt)
  assert.equal(readGridFlags(folder).length, 0, 'undoing the last mark removes the song')
})

test('changing the file resolves the flag; touching it with the same content does not', () => {
  const folder = songsFolder()
  addGridFlag(folder, 'Artiste - Chanson', 'Couplet')
  const path = join(folder, 'Artiste - Chanson.txt')
  writeFileSync(path, readFileSync(path))
  assert.equal(pruneGridFlags(folder).length, 1, 'same content keeps the flag')
  writeFileSync(path, readFileSync(path, 'utf8').replace('C G', 'C Am'))
  assert.equal(pruneGridFlags(folder).length, 0, 'edited grid leaves the list')
  assert.equal(readGridFlags(folder).length, 0)
})

test('flagging again after an edit starts a fresh flag on the new version', () => {
  const folder = songsFolder()
  addGridFlag(folder, 'Artiste - Chanson', 'Couplet')
  writeFileSync(join(folder, 'Artiste - Chanson.txt'), 'Chanson\nArtiste\nC\npop\n\n# Couplet\nD\n')
  addGridFlag(folder, 'Artiste - Chanson', 'Pont')
  const flags = readGridFlags(folder)
  assert.equal(flags.length, 1)
  assert.deepEqual(flags[0].sections.map((s) => s.name), ['Pont'])
})

test('accented (NFD) file names, notes and manual removal', () => {
  const folder = songsFolder()
  const { flag } = addGridFlag(folder, 'Calogero - Été', null)
  assert.equal(flag.file, 'Calogero - Été.txt'.normalize('NFC'))
  assert.equal(flag.sections[0].name, 'Section inconnue')
  assert.equal(pruneGridFlags(folder).length, 1, 'NFD file on disk still matches the NFC entry')
  setGridFlagNote(folder, flag.file, '  accord faux mesure 3 ')
  assert.equal(readGridFlags(folder)[0].note, 'accord faux mesure 3')
  removeGridFlag(folder, flag.file)
  assert.equal(readGridFlags(folder).length, 0)
})

test('unknown songs are refused and a corrupt file reads as an empty list', () => {
  const folder = songsFolder()
  assert.throws(() => addGridFlag(folder, 'Inconnu - Rien', 'Couplet'))
  writeFileSync(join(folder, GRID_FLAGS_FILE), '{ pas du json')
  assert.deepEqual(readGridFlags(folder), [])
})
