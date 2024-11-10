import { CommandMenu } from '@/components/Menu/CommandMenu'
import { Menu } from '@/components/Menu/Menu'
import { SessionQueuePanel } from '@/components/Queue/SessionQueuePanel'
import { Screen } from '@/components/Screen'
import { SongComponent } from '@/components/SongComponents/SongComponent'
import { ScrollProvider } from '@/contexts/scroll'
import { useStore } from '@/store'
import { useRef } from 'react'


export function SessionScreen() {
  const { isAdmin } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <Screen>
      <Menu />
      <main className="flex min-h-screen flex-col items-start justify-between mt-16 px-4 md:px-8">
        <CommandMenu />
        <div ref={scrollRef} id="scroll-container" className="w-full relative h-[calc(100vh-124px)] py-8  overflow-scroll">
          <ScrollProvider scrollRef={scrollRef}>
            <SongComponent />
            {isAdmin && <SessionQueuePanel />}
          </ScrollProvider>
        </div>
      </main>
    </Screen>
  )
}
