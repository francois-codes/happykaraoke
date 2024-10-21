import { titleize } from '@/utils'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Section: FC<SongLineProps> = ({ content }) => {
  const sectionTitle = titleize(content.replace(/#|\[|\]/g, ''))

  return (
    <>
      <div className="line-break" />
      <h3 className="song-section text-2xl line">
        <strong>{sectionTitle}</strong>
      </h3>
    </>
  )
}
