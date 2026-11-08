import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { FC, PropsWithChildren } from 'react'
import { SectionColorBars } from './SectionColorBars'
import { SectionScrollDebugMarkers } from './SectionScrollDebugMarkers'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  const { chordsEnabled } = useStore()

  return (
    <div
      id="song-lines"
      className={cn(
        'relative flex flex-col justify-start song-content max-w-100',
        chordsEnabled ? 'song-lines--chords-on' : 'song-lines--lyrics-only w-full'
      )}
    >
      <SectionColorBars />
      <SectionScrollDebugMarkers />
      {children}
      <div className="h-[100vh]" data-song-end aria-hidden />
    </div>
  )
}
