import type { VoiceSegment } from '@shared/lib/song/voices'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'
import { paintVoices } from './VoiceText'

export const Lyrics: FC<SongLineProps & { voiceSegments?: VoiceSegment[] }> = ({ content, voiceSegments }) => {
  return <pre className="line responsive-font font-mono">{paintVoices(content, 0, voiceSegments)}</pre>
}
