import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { setStructureBarEnabled } from '@/lib/structureBarSettings'
import { useDispatch, useStore } from '@/store'
import { FC } from 'react'
import { SettingEmoji } from './SettingEmoji'

/** Shows / hides the structure bar on this device (remembered in localStorage). */
export const ToggleStructureBar: FC = () => {
  const { structureBar } = useStore()
  const dispatch = useDispatch()

  const toggleStructureBar = (): void => {
    setStructureBarEnabled(!structureBar)
    dispatch({ structureBar: !structureBar })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="structure-bar" checked={structureBar} onClick={toggleStructureBar} />
      <SettingEmoji emoji="🗺️" />
      <Label htmlFor="structure-bar">Barre de structure</Label>
    </div>
  )
}
