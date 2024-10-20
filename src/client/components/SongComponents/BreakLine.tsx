import { useStore } from '@/store'
import { FC } from 'react'

export const BreakLine: FC = () => {
  const { chordsEnabled } = useStore()

  const className = chordsEnabled ? 'line' : 'line-lyrics-only'
  return <div className={className} />
}
