/** Section families that get a fixed colour when chords are displayed. */
export type SectionKind = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'solo' | 'outro'

interface SectionKindRule {
  kind: SectionKind
  pattern: RegExp
}

/** Order matters: "pre-chorus" must win over "chorus", "pre-verse" over "verse". */
const RULES: SectionKindRule[] = [
  { kind: 'prechorus', pattern: /\bpre[\s-]*(chorus|refrain|verse|couplet)/ },
  { kind: 'intro', pattern: /\bintro/ },
  { kind: 'outro', pattern: /\b(outro|coda|fin|ending)\b/ },
  { kind: 'chorus', pattern: /\b(chorus|refrain|hook)/ },
  { kind: 'verse', pattern: /\b(verse|couplet|vers\b)/ },
  { kind: 'bridge', pattern: /\b(bridge|pont\b|middle)/ },
  { kind: 'solo', pattern: /\b(solo|inst|intrumental|interlude|break|riff)/ }
]

/** Lower-cases, strips accents, `#`, `[ ]`, digits and extra spaces from a section header. */
function normalizeSectionTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[#[\]0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Maps a section header ("# Verse 1", "[Refrain]", "Pré-refrain"…) to its colour family, or null if unknown. */
export function getSectionKind(title: string): SectionKind | null {
  const normalized = normalizeSectionTitle(title)
  if (normalized === '') return null
  return RULES.find((rule) => rule.pattern.test(normalized))?.kind ?? null
}
