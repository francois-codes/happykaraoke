import { getSectionKind } from '@/lib/sectionKind'
import { titleize } from '@/utils'
import type { SectionVoice } from '@shared/lib/song/voices'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Section: FC<SongLineProps & { sectionVoice?: SectionVoice }> = ({ content, sectionVoice }) => {
  const sectionTitle = titleize(content.replace(/#|\[|\]/g, ''))
  // Colour family is only painted in chords mode (see .song-lines--chords-on in base.css).
  const sectionKind = getSectionKind(content) ?? undefined
  const singer = sectionVoice?.voice ? sectionVoice : undefined

  return (
    <>
      <div className="line-break" />
      <h3 className="song-section " data-section-kind={sectionKind}>
        <strong>{singer ? titleize(singer.part) : sectionTitle}</strong>
        {singer && (
          <>
            {' '}
            <span className={`voice-chip voice-${singer.voice}`}>{singer.singer === '?' ? '?' : singer.singer}</span>
            {singer.info && <span className="voice-info"> {singer.info}</span>}
          </>
        )}
      </h3>
    </>
  )
}
