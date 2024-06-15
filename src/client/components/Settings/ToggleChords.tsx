import { FC } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'

export const ToggleChords: FC = () => {
  const { chordsEnabled } = useStore()
  const dispatch = useDispatch()

  const toggleChords = () => {
    dispatch({ chordsEnabled: !chordsEnabled })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" checked={chordsEnabled} onClick={toggleChords} />
      <Label htmlFor="airplane-mode">Afficher les accords</Label>
    </div>
  )
}
