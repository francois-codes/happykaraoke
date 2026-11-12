import { CoverLayer } from '@/components/Cover/CoverLayer'
import { GridFlagShortcut } from '@/components/GridFlags/GridFlagShortcut'
import { CommandMenu } from '@/components/Menu/CommandMenu'
import { Menu } from '@/components/Menu/Menu'
import { SessionQueuePanel } from '@/components/Queue/SessionQueuePanel'
import { Screen } from '@/components/Screen'
import { SongComponent } from '@/components/SongComponents/SongComponent'
import { StructureBar } from '@/components/SongComponents/StructureBar'
import { ScrollProvider } from '@/contexts/scroll'
import { useStore } from '@/store'
import { useRef } from 'react'
import { useScrollMasterSync } from '@/lib/useScrollMasterSync'

export function SessionScreen() {
  const { isAdmin } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync scroll master state across admin clients
  useScrollMasterSync()

  return (
    <Screen>
      <Menu />
      <main className="flex min-h-screen flex-col items-start justify-between mt-16">
        <CommandMenu />
        <CoverLayer />
        {isAdmin && <GridFlagShortcut />}
        {/* Wrapper so the structure bar sits over the right edge of the scroll area without scrolling with it. */}
        <div className="relative w-full">
          <div
            ref={scrollRef}
            id="scroll-container"
            className="w-full relative h-[calc(100vh-124px)] overflow-scroll px-4 pb-8 pt-0 md:px-8"
          >
            <ScrollProvider scrollRef={scrollRef}>
              <SongComponent />
              {isAdmin && <SessionQueuePanel />}
            </ScrollProvider>
          </div>
          <StructureBar />
        </div>
      </main>
    </Screen>
  )
}
