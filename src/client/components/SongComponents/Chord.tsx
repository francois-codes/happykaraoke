import { useStore } from '@/store'
import { Chord } from '@shared/lib/song/chord'
import { transposeChord } from '@shared/lib/transpose/tonality'

import { FC } from 'react'

interface ChordProps {
  label: string
}

export const ChordLabel: FC<ChordProps> = ({ label }) => {
  const chord = new Chord(label)
  const { transpo, songKey } = useStore()

  const transposed = transposeChord(songKey, transpo, chord.label)

  return (
    <span className="bg-gray-200 dark:bg-gray-600 py-[2px] px-[4px] -my-[2px] -my-[4px]">
      {transposed}
    </span>
  )
}
