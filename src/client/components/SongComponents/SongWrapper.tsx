import { FC, PropsWithChildren } from 'react'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative flex flex-col justify-start w-full song-content max-w-100">
      {children}
      <div className="h-[400px]" />
    </div>
  )
}
