import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Spacer: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()

  if (chordsEnabled || !content || content?.length === 0) {
    return <div>{content}</div>
  }

  return <div className="text-xl leading-[24px] md:leading-[48px]">{content}</div>
}
