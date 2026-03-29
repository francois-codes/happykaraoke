import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Spacer: FC<SongLineProps> = ({ content }) => {
  return <div className="block line responsive-font spacer-with-chords">{content}</div>
}
