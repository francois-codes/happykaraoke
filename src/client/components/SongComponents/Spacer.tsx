import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Spacer: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()
  if (chordsEnabled) {
    return <div>{content}</div>
  }

  return <div className="text-xl leading-[48px]">{content}</div>
}
