import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { KEYS } from '@/lib/consts'
import { useDarkTheme } from '@/lib/useDarkTheme'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { IoSettingsOutline } from 'react-icons/io5'
import { FlexModal } from '../Flex/FlexModal'
import { ToggleChords } from '../Settings/ToggleChords'
import { ToggleDarkMode } from '../Settings/ToggleDarkMode'
import { ToggleDebugScrollAnchors } from '../Settings/ToggleDebugScrollAnchors'
import { Button } from '../ui/button'
import { AddSongWithAIButton } from './AddSongWithAIButton'
import { AISongPreviewModal } from './AISongPreviewModal'
import { AISongSearchModal } from './AISongSearchModal'
import { CloseSession } from './CloseSession'
import { Logout } from './Logout'
import { OpenAIKeyButton } from './OpenAIKeyButton'
import { OpenAIKeyModal } from './OpenAIKeyModal'
import { ScrollDiagnostics } from './ScrollDiagnostics'
import { SessionLogs } from './SessionLogs'
import { SongsFolderSelector } from './SongsFolderSelector'
import { SongsFolderSelectorButton } from './SongsFolderSelectorButton'
import { ToggleDrummerMode } from './ToggleDrummerMode'
import { ToggleGuitaristMode } from './ToggleGuitaristMode'
import { ToggleMusicianScroll } from './ToggleMusicianScroll'
import { ToggleScrollMaster } from './ToggleScrollMaster'

export function SettingsPanel() {
  const theme = useDarkTheme()
  const {
    settingsOpen,
    searchOpen,
    qrCodeOpen,
    isAdmin,
    aiSearchOpen,
    aiPreviewOpen,
    openAIKeyModalOpen
  } = useStore()
  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ settingsOpen: open })
  }

  useKeyboardShortcut(
    {
      key: [KEYS.s],
      preventDefault: true,
      disable: () =>
        searchOpen || qrCodeOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        setOpen(!settingsOpen)
      }
    },
    [searchOpen, settingsOpen, qrCodeOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.d],
      preventDefault: true,
      disable: () => searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        theme.toggleTheme()
      }
    },
    [searchOpen, theme.toggleTheme, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
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
      <PopoverContent className="w-80 p-0">
        <div className="max-h-[min(85vh,56rem)] overflow-y-auto overscroll-y-contain p-4">
          <div className="grid gap-8">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Réglages</h4>
            </div>
            <div className="grid gap-4">
              <ToggleChords />
              <ToggleMusicianScroll />
              <ToggleGuitaristMode />
              <ToggleDrummerMode />
              <ToggleDarkMode {...theme} />
              {isAdmin && <ToggleScrollMaster />}
              {isAdmin && <SongsFolderSelectorButton />}
              {isAdmin && <OpenAIKeyButton />}
              {isAdmin && <AddSongWithAIButton />}
              {isAdmin && <SessionLogs />}
              {isAdmin && <FlexModal />}
              {isAdmin && <ToggleDebugScrollAnchors />}
              {isAdmin && <ScrollDiagnostics />}
              {isAdmin && <CloseSession />}
              <Logout />
            </div>
          </div>
        </div>
        {isAdmin && <SongsFolderSelector />}
        {isAdmin && <OpenAIKeyModal />}
        {isAdmin && <AISongSearchModal />}
        {isAdmin && <AISongPreviewModal />}
      </PopoverContent>
    </Popover>
  )
}
