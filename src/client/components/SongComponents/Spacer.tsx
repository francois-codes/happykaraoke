import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Spacer: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()

  if (chordsEnabled || !content || content?.length === 0) {
    return <div className="line responsive-font">Spacer{content}</div>
  }

  return <div className="lyrics-only-font line-lyrics-only">{content}</div>
}
