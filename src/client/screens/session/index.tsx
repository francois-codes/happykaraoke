import { CommandMenu } from '@/components/Menu/CommandMenu'
import { Menu } from '@/components/Menu/Menu'
import { SessionQueuePanel } from '@/components/Queue/SessionQueuePanel'
import { Screen } from '@/components/Screen'
import { SongComponent } from '@/components/SongComponents/SongComponent'
import { useStore } from '@/store'

export function SessionScreen() {
  const { isAdmin } = useStore()

  return (
    <Screen>
      <Menu />
      <main className="flex min-h-screen flex-col items-start justify-between mt-16 py-8 px-4 md:px-8">
        <CommandMenu />
        <div className="w-full relative">
          <SongComponent />
          {isAdmin && <SessionQueuePanel />}
        </div>
      </main>
    </Screen>
  )
}
