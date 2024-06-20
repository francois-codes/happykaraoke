import { titleize } from '@/utils'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Section: FC<SongLineProps> = ({ content }) => {
  const sectionTitle = titleize(content.replace('#', ''))

  return (
    <h3 className="song-section text-2xl pb-2 pt-8">
      <strong>{sectionTitle}</strong>
    </h3>
  )
}
