import { FC, PropsWithChildren } from 'react'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative flex flex-col justify-start w-full text-xs sm:text-base max-w-100 lg:max-w-[756px]">
      {children}
      <div className="h-[400px]" />
    </div>
  )
}
