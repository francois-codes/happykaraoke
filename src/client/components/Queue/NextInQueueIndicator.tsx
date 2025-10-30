import { useStore } from '@/store'
import { useNextInQueue } from './useNextInQueue'
import { Button } from '../ui/button'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

export function NextInQueueIndicator() {
  const { isAdmin, transpoOpen, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } = useStore()

  const { nextInQueue, playNextInQueue } = useNextInQueue()

  useKeyboardShortcut(
    {
      key: KEYS.n,
      modifier: [KEYS.Ctrl],
      disable: () => !isAdmin || transpoOpen || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        playNextInQueue()
      }
    },
    [isAdmin, searchOpen, transpoOpen, playNextInQueue, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  if (!nextInQueue) return null

  return (
    <div className="mt-16">
      {isAdmin ? (
        <Button onClick={playNextInQueue}>
          Lancer {nextInQueue.song}
          {nextInQueue.user && <> - chanté par: {nextInQueue.user}</>}
        </Button>
      ) : (
        <div className="text-xl font-bold">
          Prochaine chanson
          <br />
          {nextInQueue.song}
          {nextInQueue.user && (
            <>
              <br />
              intepreté par: {nextInQueue.user}
            </>
          )}
        </div>
      )}
    </div>
  )
}
