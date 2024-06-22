import { Button } from '../ui/button'
import { IoSettingsOutline } from 'react-icons/io5'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleChords } from '../Settings/ToggleChords'
import { ToggleDarkMode } from '../Settings/ToggleDarkMode'
import { useDarkTheme } from '@/lib/useDarkTheme'
import { useDispatch, useStore } from '@/store'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'
import { SessionLogs } from './SessionLogs'
import { CloseSession } from './CloseSession'
import { SongsFolderSelector } from './SongsFolderSelector'
import { SongsFolderSelectorButton } from './SongsFolderSelectorButton'

export function SettingsPanel() {
  const theme = useDarkTheme()
  const { settingsOpen, searchOpen, qrCodeOpen, isAdmin } = useStore()
  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ settingsOpen: open })
  }

  useKeyboardShortcut(
    {
      key: [KEYS.s],
      preventDefault: true,
      disable: () => searchOpen || qrCodeOpen,
      handler: () => {
        setOpen(!settingsOpen)
      }
    },
    [searchOpen, settingsOpen, qrCodeOpen]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.d],
      preventDefault: true,
      disable: () => searchOpen,
      handler: () => {
        theme.toggleTheme()
      }
    },
    [searchOpen, theme.toggleTheme]
  )

  useKeyboardShortcut({
    key: [KEYS.o],
    modifier: [KEYS.Meta],
    preventDefault: true,
    handler: () => {
      dispatch({ songsFolderOpen: true })
    }
  })

  return (
    <Popover open={settingsOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="text-xl">
          <IoSettingsOutline size={24} />
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
            {isAdmin && <SongsFolderSelectorButton />}
            {isAdmin && <SessionLogs />}
            {isAdmin && <CloseSession />}
          </div>
        </div>
        {isAdmin && <SongsFolderSelector />}
      </PopoverContent>
    </Popover>
  )
}
