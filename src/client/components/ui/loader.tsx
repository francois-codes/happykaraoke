import { makeArray } from '@/utils'
import './loader.css'
import { useEffect, useState } from 'react'

const five = makeArray(5)
const fourteen = makeArray(14)

const notesPositions = {
  A: -7,
  B: -11,
  C: -14,
  D: -18,
  E: -21,
  F: -25,
  G: -28
}

const noteMap = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
  5: 'B',
  6: 'C',
  7: 'A',
  8: 'A',
  9: 'A',
  10: 'E',
  11: 'E',
  12: 'D',
  13: 'E',
  14: 'E'
}

const ANIMATION_LOOP = 4_600

export function Loader({ open, showTitle = false }) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setKey((prevKey) => prevKey + 1)
    }, ANIMATION_LOOP)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`w-full h-full flex flex-col gap-12 items-center justify-center fade-in ${open ? 'open' : ''}`}
    >
      {showTitle && <h1 className="text-3xl font-bold">HappiKaraoke v2 🎙️ 🎸 🎹 🥁</h1>}
      <LoaderComponent key={key} />
    </div>
  )
}

function LoaderComponent() {
  return (
    <div className="relative w-[200px] h-[50px]">
      {five.map((i) => (
        <div
          className="absolute w-full h-[1px] bg-slate-900 dark:bg-slate-100"
          key={i}
          style={{ top: i * 7 }}
        />
      ))}
      {fourteen.map((i) => (
        <div
          className="note"
          style={{
            left: (i - 1) * 13 + 3,
            top: notesPositions[noteMap[i]],
            animationDelay: `${0.2 * i + 0.5}s`
          }}
          key={i}
        >
          {i === 13 || i === 14 ? '♩' : '♪'}
        </div>
      ))}
    </div>
  )
}
