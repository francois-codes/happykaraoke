import { useStore } from '@/store'
import { useNextInQueue } from './useNextInQueue'
import { Button } from '../ui/button'

export function NextInQueueIndicator() {
  const { isAdmin } = useStore()

  const { nextInQueue, playNextInQueue } = useNextInQueue()

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
