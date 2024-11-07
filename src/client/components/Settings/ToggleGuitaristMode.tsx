import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import { FC } from 'react'

export const ToggleGuitaristMode: FC = () => {
  const { guitaristMode } = useStore()
  const dispatch = useDispatch()

  const toggleGuitaristMode = () => {
    dispatch({ guitaristMode: !guitaristMode })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" checked={guitaristMode} onClick={toggleGuitaristMode} />
      <Label htmlFor="airplane-mode">Mode Guitariste</Label>
    </div>
  )
}
