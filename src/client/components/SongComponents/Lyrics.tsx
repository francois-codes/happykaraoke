import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Lyrics: FC<SongLineProps> = ({ content }) => {
  return <pre className="line responsive-font font-mono">{content}</pre>
}
