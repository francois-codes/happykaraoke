import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { FC, PropsWithChildren } from 'react'
import { SectionScrollDebugMarkers } from './SectionScrollDebugMarkers'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  const { chordsEnabled } = useStore()

  return (
    <div
      id="song-lines"
      className={cn(
        'relative flex flex-col justify-start w-full song-content max-w-100',
        !chordsEnabled && 'song-lines--lyrics-only'
      )}
    >
      <SectionScrollDebugMarkers />
      {children}
      <div className="h-[100vh]" aria-hidden />
    </div>
  )
}
