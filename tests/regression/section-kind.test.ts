import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getSectionKind, type SectionKind } from '../../src/client/lib/sectionKind'

const CASES: [string, SectionKind | null][] = [
  ['# Intro', 'intro'],
  ['[Intro]', 'intro'],
  ['# Couplet 1', 'verse'],
  ['#  couplet 2', 'verse'],
  ['[Couplet 1]', 'verse'],
  ['# Verse 2', 'verse'],
  ['[verse]', 'verse'],
  ['# Pre-Chorus', 'prechorus'],
  ['# Pré-refrain', 'prechorus'],
  ['# Pre-Verse', 'prechorus'],
  ['# Prechorus', 'prechorus'],
  ['[Refrain]', 'chorus'],
  ['# Chorus', 'chorus'],
  ['# CHORUS 2', 'chorus'],
  ['# Refrain final', 'chorus'],
  ['# Bridge', 'bridge'],
  ['[Pont]', 'bridge'],
  ['# Solo', 'solo'],
  ['# Instrumental', 'solo'],
  ['# Interlude', 'solo'],
  ['# Riff', 'solo'],
  ['# Instu', 'solo'],
  ['# Middle 8', 'bridge'],
  ['# Ending', 'outro'],
  ['# Outro', 'outro'],
  ['[Outro]', 'outro'],
  ['', null],
  ['#', null],
  ['# Partie spéciale', null]
]

test('section headers from the song library map to a stable colour family', () => {
  for (const [title, expected] of CASES) {
    assert.equal(getSectionKind(title), expected, `"${title}"`)
  }
})
