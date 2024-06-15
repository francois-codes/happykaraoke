import { Button } from '../ui/button'
import { IoSettingsOutline } from 'react-icons/io5'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleChords } from '../Settings/ToggleChords'
import { ToggleDarkMode } from '../Settings/ToggleDarkMode'
import { useDarkTheme } from '@/lib/useDarkTheme'

export function SettingsPanel() {
  const theme = useDarkTheme()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="text-xl">
          <IoSettingsOutline />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-8">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Réglages</h4>
          </div>
          <div className="grid gap-4">
            <ToggleChords />
            <ToggleDarkMode {...theme} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
