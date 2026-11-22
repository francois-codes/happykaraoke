import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { KEYS } from '@/lib/consts'
import { useDarkTheme } from '@/lib/useDarkTheme'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import type { ReactNode } from 'react'
import { IoSettingsOutline } from 'react-icons/io5'
import { FlexModal } from '../Flex/FlexModal'
import { ToggleChords } from '../Settings/ToggleChords'
import { ToggleDarkMode } from '../Settings/ToggleDarkMode'
import { Button } from '../ui/button'
import { AddGridFromUltimateGuitar } from './AddGridFromUltimateGuitar'
import { GridFlagsList } from './GridFlagsList'
import { GuestRoleSwitch } from './GuestRoleSwitch'
import { Logout } from './Logout'
import { ScrollDiagnostics } from './ScrollDiagnostics'
import { SessionLogs } from './SessionLogs'
import { LivesList } from './LivesList'
import { SongsFolderSelector } from './SongsFolderSelector'
import { SongsFolderSelectorButton } from './SongsFolderSelectorButton'
import { ToggleDrummerMode } from './ToggleDrummerMode'
import { ToggleGuitaristMode } from './ToggleGuitaristMode'
import { ToggleMusicianScroll } from './ToggleMusicianScroll'
import { ToggleStructureBar } from './ToggleStructureBar'

export function SettingsPanel() {
  const theme = useDarkTheme()
  const {
    settingsOpen,
    searchOpen,
    qrCodeOpen,
    isAdmin,
    guestRole,
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
          <div className="grid gap-6">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Réglages</h4>
            </div>
            {!isAdmin && <GuestRoleSwitch />}
            <MenuBlock title="Mon écran">
              <ToggleChords />
              <ToggleStructureBar />
              {(isAdmin || guestRole === 'musicien') && <ToggleMusicianScroll />}
              <ToggleDarkMode {...theme} />
              <ToggleGuitaristMode />
              <ToggleDrummerMode />
            </MenuBlock>
            {isAdmin && (
              <MenuBlock title="Lives">
                <LivesList />
                <GridFlagsList />
              </MenuBlock>
            )}
            {isAdmin && (
              <MenuBlock title="Bibliothèque">
                <AddGridFromUltimateGuitar />
                <FlexModal />
                <SongsFolderSelectorButton />
              </MenuBlock>
            )}
            {isAdmin && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground">Plus</summary>
                <div className="mt-4 grid gap-4">
                  <SessionLogs />
                  <ScrollDiagnostics />
                </div>
              </details>
            )}
            <Logout />
          </div>
        </div>
        {isAdmin && <SongsFolderSelector />}
      </PopoverContent>
    </Popover>
  )
}

/** A titled group of settings ("Mon écran", "Lives", "Bibliothèque"). */
function MenuBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h5>
      {children}
    </section>
  )
}
