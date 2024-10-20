import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Lyrics: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()

  if (chordsEnabled) {
    return <pre className="line responsive-font font-mono">{content}</pre>
  }

  return <p className="line-lyrics-only lyrics-only-font flex items-end">{content}</p>
}
