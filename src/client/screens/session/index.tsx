import { Menu } from '@/components/Menu/Menu'
import { CommandMenu } from '@/components/Menu/CommandMenu'
import { SongComponent } from '@/components/SongComponents/SongComponent'
import { Screen } from '@/components/Screen'
import { useStore } from '@/store'
import { SessionQueuePanel } from '@/components/Queue/SessionQueuePanel'

export function SessionScreen() {
  const { isAdmin } = useStore()

  return (
    <Screen>
      <Menu />
      <main className="flex min-h-screen flex-col items-start justify-between mt-16 p-8">
        <CommandMenu />
        <div className="w-full relative">
          <SongComponent />
          {isAdmin && <SessionQueuePanel />}
        </div>
      </main>
    </Screen>
  )
}
