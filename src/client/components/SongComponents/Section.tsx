import { getSectionKind } from '@/lib/sectionKind'
import { titleize } from '@/utils'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Section: FC<SongLineProps> = ({ content }) => {
  const sectionTitle = titleize(content.replace(/#|\[|\]/g, ''))
  // Colour family is only painted in chords mode (see .song-lines--chords-on in base.css).
  const sectionKind = getSectionKind(content) ?? undefined

  return (
    <>
      <div className="line-break" />
      <h3 className="song-section " data-section-kind={sectionKind}>
        <strong>{sectionTitle}</strong>
      </h3>
    </>
  )
}
