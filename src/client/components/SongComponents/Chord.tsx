import { useStore } from '@/store'
import { Chord } from '@shared/lib/song/chord'
import { transposeChord } from '@shared/lib/transpose/tonality'

import { FC } from 'react'

/** Matches slash-chord bass after transpose, aligned with transpose/chord parsing. */
const SLASH_BASS_SUFFIX = /^(.+)\/([A-G](?:#|b)?)$/

function splitSlashBass(transposed: string): { main: string; bass?: string } {
  const m = transposed.match(SLASH_BASS_SUFFIX)
  if (!m) return { main: transposed }
  return { main: m[1], bass: m[2] }
}

interface ChordProps {
  label: string
}

export const ChordLabel: FC<ChordProps> = ({ label }) => {
  const chord = new Chord(label)
  const { transpo, songKey } = useStore()

  const transposed = transposeChord(songKey, transpo, chord.label)
  const { main, bass } = splitSlashBass(transposed)

  return (
    <span className="chord-font bg-primary/40 px-[4px] -my-[4px] font-bold inline-flex items-baseline gap-0">
      <span>{main}</span>
      {bass != null && (
        <span className="inline-block translate-y-[0.14em] text-[0.88em] leading-none">
          /{bass}
        </span>
      )}
    </span>
  )
}
