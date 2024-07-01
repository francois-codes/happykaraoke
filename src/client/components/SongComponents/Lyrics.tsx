import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const Lyrics: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()

  if (chordsEnabled) {
    return <pre className="py-2 font-mono">{content}</pre>
  }

  return (
    <p className="py-2 text-xl md:text-3xl w-full leading-[24px] md:leading-[48px]">{content}</p>
  )
}
