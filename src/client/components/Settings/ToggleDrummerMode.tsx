import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import { FC } from 'react'

export const ToggleDrummerMode: FC = () => {
  const { drummerMode } = useStore()
  const dispatch = useDispatch()

  const toggleDrummerMode = () => {
    dispatch({ drummerMode: !drummerMode })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" checked={drummerMode} onClick={toggleDrummerMode} />
      <Label htmlFor="airplane-mode">Mode Batteur 🥁</Label>
    </div>
  )
}
