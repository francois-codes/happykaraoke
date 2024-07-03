import { useStore } from '@/store'
import { useNextInQueue } from './useNextInQueue'
import { Button } from '../ui/button'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

export function NextInQueueIndicator() {
  const { isAdmin, transpoOpen, searchOpen } = useStore()

  const { nextInQueue, playNextInQueue } = useNextInQueue()

  useKeyboardShortcut(
    {
      key: KEYS.n,
      modifier: [KEYS.Ctrl],
      disable: () => !isAdmin || transpoOpen || searchOpen,
      preventDefault: true,
      handler: () => {
        playNextInQueue()
      }
    },
    [isAdmin, searchOpen, transpoOpen, playNextInQueue]
  )

  if (!nextInQueue) return null

  return (
    <div className="mt-16">
      {isAdmin ? (
        <Button onClick={playNextInQueue}>Lancer {nextInQueue.song}</Button>
      ) : (
        <div className="text-xl font-bold">
          Prochaine chanson
          <br />
          {nextInQueue.song}
        </div>
      )}
    </div>
  )
}
