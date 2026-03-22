import { FC, PropsWithChildren } from 'react'
import { SectionScrollDebugMarkers } from './SectionScrollDebugMarkers'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      id="song-lines"
      className="relative flex flex-col justify-start w-full song-content max-w-100"
    >
      <SectionScrollDebugMarkers />
      {children}
      <div className="h-[100vh]" aria-hidden />
    </div>
  )
}
