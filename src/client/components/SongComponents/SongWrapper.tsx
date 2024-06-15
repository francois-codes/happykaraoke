import { FC, PropsWithChildren } from 'react'

export const SongWrapper: FC<PropsWithChildren> = ({ children }) => {
  return <div className="relative flex flex-col justify-start">{children}</div>
}
