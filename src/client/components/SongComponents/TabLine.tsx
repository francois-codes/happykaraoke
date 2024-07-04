import { useStore } from '@/store'
import { cn } from '@/utils'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'

export const TabLine: FC<SongLineProps> = ({ content }) => {
  const { chordsEnabled } = useStore()

  return (
    <pre className={cn('leading-[16px]', chordsEnabled ? 'font-mono' : '')}>
      {chordsEnabled ? content : ' '}
    </pre>
  )
}
