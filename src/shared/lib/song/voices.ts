/**
 * Who sings what in duets ("qui chante").
 *
 * Grid conventions (see SONG_FORMAT.md, "Voices in duets"):
 * - `[Couplet 1 (Andrea, piano solo)]`: one voice for the whole paragraph, named first in the parentheses;
 *   what follows the comma is a musical indication.
 * - `Hélène : text`: switches voice until the next name or the end of the paragraph, also mid-line.
 *   `Duo :` = both, `Tous :` = everyone, `? :` = unknown.
 * - `(text)`: the other voice answers; `(Aladdin : text)` names it; `(Solo)`, `(Instru)`… are indications.
 *
 * Pure functions, no DOM: the client paints the segments, chords and layout are untouched
 * (a `Name : ` prefix keeps its characters, so columns never move).
 */

export type VoiceClass = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'duo' | 'unknown' | 'echo'

export interface SongVoices {
  /** True when the grid names at least two voices (or one voice in a song tagged `duo`). */
  enabled: boolean
  /** Named voices in order of first appearance (without Duo / Tous / ?). */
  names: string[]
}

export interface SectionVoice {
  /** Part name without the parentheses, e.g. "Couplet 1". */
  part: string
  /** Singer of the whole paragraph, as written (e.g. "Andrea", "Duo", "?"), or null. */
  singer: string | null
  voice: VoiceClass | null
  /** Musical indication that followed the singer, e.g. "piano solo". */
  info: string
}

export type VoiceSegmentKind = 'text' | 'tag' | 'reply' | 'indication'

export interface VoiceSegment {
  /** Character range in the lyric line, `end` excluded. */
  start: number
  end: number
  kind: VoiceSegmentKind
  /** Null for plain text outside any voice and for indications. */
  voice: VoiceClass | null
  /** For `tag`: the name as written. */
  name?: string
}

export interface VoiceState {
  current: VoiceClass | null
}

const RESERVED: Record<string, VoiceClass> = { duo: 'duo', both: 'duo', tous: 'duo', all: 'duo', '?': 'unknown' }
const MAX_VOICES = 6

/** Parenthesised words that are musical or playing indications, never a sung reply. */
const INDICATION =
  /^(solo|instru\w*|piano\b.*|guitar\w*\b.*|guitare\w*\b.*|\d+\s*(measures?|mesures?|bars?)|break|tutti\b.*|a\s?cap+el+a|bass[e]?\b.*|batterie|drums?|ad\s?lib\.?|spoken|speaking|parl[ée]|hablado|cantado.*|lick|ch(œ|oe)urs?\b.*|choir|x\d+|fin|end|ending|coda|riff\w*|intro|outro|fade.*|rall\w*|acc[ée]l\w*|lead|keyboards?|keybords?|add\b.*|no\b.*|sans\b.*|avec\b.*|full\b.*|slow|fast|live|groove|vibes|half\b.*|double\b.*|key\b.*|reggae|rock|jazz\b.*|swing|shuffle|ragga|rap\b.*|talk\w*|musical|chant[ée]|chords?|tab|theme|thème|percu\w*|majeur|mineur|transition|intermède|marche|adagio|tempo\b.*|repeat\w*|variation\w*|opera|big\b.*|gitar\w*\b.*|modulation\b.*|fran[cç]ais\b.*|deutsch\b.*|english|italiano?|italien|espa[ñn]ol|aigu|grave)$/i
/** Solfège syllables used as section names in some grids (Do, Ré…), never voices. */
const SOLFEGE = /^(do|ré|re|mi|fa|sol|la|si)$/i
/** One word of a voice name: starts with a capital letter (Garou, Jean-Louis, Diam's), or a stage name like -M-. */
const NAME_WORD = /^(\p{Lu}[^\s():[\]]*|-\p{Lu}+-)$/u

export function isIndication(text: string): boolean {
  return INDICATION.test(text.trim())
}

function looksLikeName(text: string): boolean {
  const t = text.trim()
  if (t === '?') return true
  const words = t.split(' ')
  if (t.length < 2 || words.length > 3 || /\d/.test(t) || isIndication(t) || SOLFEGE.test(t)) return false
  // Every word capitalised (« Elle m'dit : » or « J'ai dit : » in lyrics are not voices), none shouted (BIG Sound).
  return words.every((w) => NAME_WORD.test(w) && !(w.length > 3 && w === w.toUpperCase()))
}

function reservedClass(name: string): VoiceClass | undefined {
  return RESERVED[name.trim().toLowerCase()]
}

/** Finds the voices named in a grid (section headers and `Name : ` line prefixes). */
export function detectVoices(lines: string[], tags: string[] = []): SongVoices {
  const names: string[] = []
  const add = (name: string): void => {
    const n = name.trim()
    if (reservedClass(n) || names.includes(n) || !looksLikeName(n)) return
    names.push(n)
  }
  for (const line of lines) {
    const header = line.trim().match(/^\[[^\]]*?\(([^,)]+)/)
    if (header) {
      add(header[1])
      continue
    }
    const prefix = line.match(/^\s*([^\s():[\]]+(?: [^\s():[\]]+){0,2}) :\s+\S/)
    if (prefix) add(prefix[1])
  }
  const isDuoTagged = tags.some((t) => t.trim().toLowerCase() === 'duo')
  return { enabled: names.length >= 2 || (names.length === 1 && isDuoTagged), names: names.slice(0, MAX_VOICES) }
}

export function voiceClassOf(name: string, voices: SongVoices): VoiceClass | null {
  const reserved = reservedClass(name)
  if (reserved) return reserved
  const index = voices.names.indexOf(name.trim())
  return index >= 0 ? (`v${index + 1}` as VoiceClass) : null
}

/** The voice that answers in parentheses: the other one of a duet, an echo otherwise. */
export function otherVoice(current: VoiceClass | null): VoiceClass {
  if (current === 'v1') return 'v2'
  if (current === 'v2') return 'v1'
  return 'echo'
}

/** Splits a section header: `[Couplet 1 (Andrea, piano solo)]` → part, singer, info. */
export function parseSectionTitle(title: string, voices: SongVoices): SectionVoice {
  const inner = title.replace(/^\s*[#[]\s*/, '').replace(/\]\s*$/, '').trim()
  const match = inner.match(/^(.*?)\s*\((.*)\)\s*$/)
  if (!match || !voices.enabled) return { part: inner, singer: null, voice: null, info: '' }
  const items = match[2].split(',').map((s) => s.trim())
  const voice = items.length ? voiceClassOf(items[0], voices) : null
  if (!voice) return { part: inner, singer: null, voice: null, info: '' }
  return { part: match[1] || inner, singer: items[0], voice, info: items.slice(1).join(', ') }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Splits one lyric line into voice segments. `state.current` carries the voice from line to line
 * inside a paragraph (reset it to the section singer at each header).
 */
export function segmentLyricLine(text: string, voices: SongVoices, state: VoiceState): VoiceSegment[] {
  if (!voices.enabled) return [{ start: 0, end: text.length, kind: 'text', voice: null }]
  const alternatives = [...voices.names, 'Duo', 'Tous', 'Both', '\\?']
    .map((n) => (n === '\\?' ? n : escapeRegExp(n)))
    .join('|')
  /** `Name :` followed by a space: the tag keeps exactly its own characters. */
  const namePrefix = new RegExp(`^(${alternatives})\\s*:(?=\\s|$)`)
  const segments: VoiceSegment[] = []
  let textStart = 0
  const flush = (end: number): void => {
    if (end > textStart) segments.push({ start: textStart, end, kind: 'text', voice: state.current })
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '(') {
      const close = text.indexOf(')', i)
      const end = close < 0 ? text.length : close + 1
      const inner = text.slice(i + 1, close < 0 ? text.length : close)
      flush(i)
      const named = inner.match(namePrefix)
      if (named) {
        segments.push({ start: i, end, kind: 'reply', voice: voiceClassOf(named[1], voices), name: named[1] })
      } else if (isIndication(inner)) {
        segments.push({ start: i, end, kind: 'indication', voice: null })
      } else {
        segments.push({ start: i, end, kind: 'reply', voice: otherVoice(state.current) })
      }
      i = end
      textStart = i
      continue
    }
    if (i === 0 || /\s/.test(text[i - 1])) {
      const named = text.slice(i).match(namePrefix)
      if (named) {
        flush(i)
        state.current = voiceClassOf(named[1], voices)
        segments.push({ start: i, end: i + named[0].length, kind: 'tag', voice: state.current, name: named[1] })
        i += named[0].length
        textStart = i
        continue
      }
    }
    i++
  }
  flush(text.length)
  return segments
}
