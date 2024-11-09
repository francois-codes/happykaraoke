import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import { FC } from 'react'

export const ToggleMusicianScroll: FC = () => {
  const { musicienScroll } = useStore()
  const dispatch = useDispatch()

  const toggleMusicianScroll = () => {
    dispatch({ musicienScroll: !musicienScroll })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" checked={musicienScroll} onClick={toggleMusicianScroll} />
      <Label htmlFor="airplane-mode">Scroll musicien</Label>
    </div>
  )
}
