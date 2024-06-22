import { socket } from '@/utils/socket'
import { type QueueType } from '@shared/db/schema'
import { getQueue, removeFromQueue } from '@shared/endpoints/queue'
import { changeSong } from '@shared/endpoints/song'
import { queueChanged } from '@shared/messages/queue'
import { useEffect, useState } from 'react'

export function useNextInQueue() {
  const [nextInQueue, setNextInQueue] = useState<QueueType | null>(null)

  useEffect(() => {
    fetchQueue()
  }, [])

  async function fetchQueue() {
    const { queue } = await getQueue.call()
    setNextInQueue(queue[0])
  }

  async function playNextInQueue() {
    if (nextInQueue) {
      await changeSong.call({ title: nextInQueue.song })
      await removeFromQueue.call({ queueId: nextInQueue.id })
      fetchQueue()
    }
  }

  queueChanged.client.useMessage(socket, () => {
    fetchQueue()
  })

  return {
    nextInQueue,
    playNextInQueue
  }
}
