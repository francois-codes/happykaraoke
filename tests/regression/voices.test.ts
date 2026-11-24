import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectVoices,
  parseSectionTitle,
  segmentLyricLine,
  type VoiceSegment,
  type VoiceState
} from '../../src/shared/lib/song/voices'

const VIVO = [
  '[Couplet 1 (Andrea, piano solo)]',
  '| E                         | C#m',
  '  Vivo per lei da quando sai',
  '[Couplet 2 (Hélène, piano solo)]',
  '[Refrain 1 (piano + bass)]',
  '  Andrea : E\' una musa che ci invitaaaaaa',
  '  Hélène : Elle vivra toujours en moi',
  'Duo : io vivo per lei.'
]

const show = (text: string, segs: VoiceSegment[]): string[] =>
  segs.map((s) => `${s.kind}:${s.voice ?? '-'}:${text.slice(s.start, s.end)}`)

test('voices come from section headers and Name : prefixes, in order of appearance', () => {
  const v = detectVoices(VIVO, ['variété', 'duo'])
  assert.deepEqual(v, { enabled: true, names: ['Andrea', 'Hélène'] })
})

test('indications, solfège, single letters and shouted words are never voices', () => {
  const lines = ['[Intro (6/8)]', '[Couplet (piano solo)]', '[Solo (Guitar)]', '[Do (Riff)]', '[Chorus (BIG Sound)]', '[A (S)]', '[Verse (Keyboards)]']
  assert.deepEqual(detectVoices(lines), { enabled: false, names: [] })
  assert.equal(detectVoices(['[Couplet 3 (jazz feel)]', '[Pont (lento)]']).enabled, false)
})

test('one named voice only switches the feature on in a song tagged duo', () => {
  const lines = ['[Couplet 1 (Lui)]', 'J\'ai encore rêvé d\'elle, (Je rêve aussi)']
  assert.equal(detectVoices(lines, ['variété', 'slow']).enabled, false)
  assert.equal(detectVoices(lines, ['variété', 'duo', '70s']).enabled, true)
})

test('section title: singer first, indication after; unknown first item leaves the title alone', () => {
  const v = detectVoices(VIVO)
  assert.deepEqual(parseSectionTitle('[Couplet 1 (Andrea, piano solo)]', v), { part: 'Couplet 1', singer: 'Andrea', voice: 'v1', info: 'piano solo' })
  assert.deepEqual(parseSectionTitle('[Refrain final (Duo)]', v), { part: 'Refrain final', singer: 'Duo', voice: 'duo', info: '' })
  assert.deepEqual(parseSectionTitle('[Pont (?)]', v), { part: 'Pont', singer: '?', voice: 'unknown', info: '' })
  assert.deepEqual(parseSectionTitle('[Refrain 1 (piano + bass)]', v), { part: 'Refrain 1 (piano + bass)', singer: null, voice: null, info: '' })
  assert.deepEqual(parseSectionTitle('# Intro', v), { part: 'Intro', singer: null, voice: null, info: '' })
})

test('a Name : prefix switches the voice until the next one, also mid-line, and keeps its characters', () => {
  const v = detectVoices(['[Couplet (Renaud)]', '[Couplet (Axelle)]'])
  const state: VoiceState = { current: null }
  const line = 'Renaud : So long , adieu Axelle : mon rêve américain'
  const segs = segmentLyricLine(line, v, state)
  assert.deepEqual(show(line, segs), ['tag:v1:Renaud :', 'text:v1: So long , adieu ', 'tag:v2:Axelle :', 'text:v2: mon rêve américain'])
  assert.equal(segs.map((s) => line.slice(s.start, s.end)).join(''), line, 'segments cover the whole line')
  assert.equal(state.current, 'v2', 'the voice carries over to the next line')
})

test('All : (English grids) and Tous : sing together, like Duo', () => {
  const v = detectVoices(['[Chorus 1 (Simba)]', '[Verse 2 (Zazu)]'])
  for (const line of ["All :  Let ev'ry creature go for broke", 'Tous : on chante']) {
    const state: VoiceState = { current: null }
    const tag = line.slice(0, line.indexOf(':') + 1)
    assert.deepEqual(show(line, segmentLyricLine(line, v, state)).slice(0, 1), [`tag:duo:${tag}`])
    assert.equal(state.current, 'duo')
  }
  assert.deepEqual(v.names, ['Simba', 'Zazu'], 'All is never counted as a voice')
})

test('a name in parentheses that is not one of the voices (backing vocals) is an echo, not the other singer', () => {
  const v = detectVoices(['[Intro (Jay-Z)]', '[Intro (Beyoncé)]'])
  const line = '  (Girls : Who he think he is?) Look at what you did to me,'
  assert.deepEqual(show(line, segmentLyricLine(line, v, { current: 'v2' })), [
    'text:v2:  ',
    'reply:echo:(Girls : Who he think he is?)',
    'text:v2: Look at what you did to me,'
  ])
  assert.deepEqual(v.names, ['Jay-Z', 'Beyoncé'])
})

test('parentheses: the other voice, a named reply, an echo in a duo passage, or a musical indication', () => {
  const v = detectVoices(['[Couplet (Garou)]', '[Couplet (Céline)]'])
  const lineA = 'Mon étoile, je l\'ai suivie un instant (sous le vent)'
  assert.deepEqual(show(lineA, segmentLyricLine(lineA, v, { current: 'v1' })).slice(-1), ['reply:v2:(sous le vent)'])
  const lineB = 'Duo : et j\'ai glissé sous le vent (Céline : oooooooh)'
  assert.deepEqual(show(lineB, segmentLyricLine(lineB, v, { current: null })).slice(-1), ['reply:v2:(Céline : oooooooh)'])
  const lineC = 'Pulvérisés sur l\'autel (la violence)'
  assert.deepEqual(show(lineC, segmentLyricLine(lineC, v, { current: 'duo' })).slice(-1), ['reply:echo:(la violence)'])
  const lineD = '  (Piano)'
  assert.deepEqual(show(lineD, segmentLyricLine(lineD, v, { current: 'v1' })), ['text:v1:  ', 'indication:-:(Piano)'])
})

test('songs without voices are left exactly as they are', () => {
  const v = detectVoices(['[Couplet 1]', 'Il m\'a dit : viens'])
  const line = 'Il m\'a dit : viens (ouh ouh)'
  assert.deepEqual(segmentLyricLine(line, v, { current: null }), [{ start: 0, end: line.length, kind: 'text', voice: null }])
})

test('lyrics that merely contain a colon never switch the feature on', () => {
  const lines = ['[Couplet 1]', 'Elle m\'dit : « Viens »', 'J\'ai dit : non', 'Je suis hanté : le rythme', '[Solo (+ Drums)]', '[Pont (Gitarre Electrique)]', '[Fin (Modulation F)]', '[Couplet (— Blacko)]', '[Intro (??)]']
  assert.deepEqual(detectVoices(lines), { enabled: false, names: [] })
})

test('stage names and extra spaces after the colon are recognised', () => {
  assert.deepEqual(detectVoices(['[Couplet 1 (Vanessa)]', '[Couplet 3 (-M-)]']).names, ['Vanessa', '-M-'])
  assert.deepEqual(detectVoices(['Simba : I\'m gonna be a mighty king', 'Zazu :  Well, I\'ve never seen']).names, ['Simba', 'Zazu'])
})
