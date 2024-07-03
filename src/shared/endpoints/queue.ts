import { QueueType } from '@shared/db/schema'
import { queueChanged } from '@shared/messages/queue'
import { createEndpoint } from '@shared/types/endpoints'

export const getQueue = createEndpoint<unknown, { queue: (QueueType & { user: string | null })[] }>(
  {
    method: 'get',
    url: '/get-queue',
    cache: false,
    handler: async (_, res) => {
      const { getQueueForCurrentSession } = await import('@shared/lib/session/queue')
      const queue = await getQueueForCurrentSession()
      res.status(200).json({ queue })
    }
  }
)

export const addToQueue = createEndpoint<{ song: string; userId?: string }, unknown>({
  method: 'post',
  url: '/add-song-to-queue',
  handler: async (req, res) => {
    const { song, userId } = req.body
    const { addSongToQueue } = await import('@shared/lib/session/queue')
    await addSongToQueue(song, userId)
    queueChanged.server.emit({})
    res.sendStatus(200)
  }
})

export const removeFromQueue = createEndpoint<{ queueId: number }, unknown>({
  method: 'post',
  url: '/remove-song-from-queue',
  handler: async (req, res) => {
    const { queueId } = req.body
    const { removeSongFromQueue } = await import('@shared/lib/session/queue')
    await removeSongFromQueue(queueId)
    queueChanged.server.emit({})
    res.sendStatus(200)
  }
})

export const reorderQueue = createEndpoint<{ queue: Pick<QueueType, 'id' | 'order'>[] }, unknown>({
  method: 'post',
  url: '/reorder-queue',
  handler: async (req, res) => {
    const { queue } = req.body
    const { reorderQueue } = await import('@shared/lib/session/queue')
    await reorderQueue(queue)
    queueChanged.server.emit({})
    res.sendStatus(200)
  }
})

export const clearQueue = createEndpoint<unknown, unknown>({
  method: 'post',
  url: '/clear-queue',
  handler: async (_, res) => {
    const { clearQueue } = await import('@shared/lib/session/queue')
    await clearQueue()
    queueChanged.server.emit({})
    res.sendStatus(200)
  }
})
