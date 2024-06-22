import { QueueType } from '@shared/db/schema'
import { queueChanged } from '@shared/messages/queue'
import { createEndpoint } from '@shared/types/endpoints'

export const getQueue = createEndpoint<unknown, { queue: QueueType[] }>({
  method: 'get',
  url: '/get-queue',
  cache: false,
  handler: async (_, res) => {
    const { getQueueForCurrentSession } = await import('@shared/lib/session/queue')
    const queue = await getQueueForCurrentSession()
    res.status(200).json({ queue })
  }
})

export const addToQueue = createEndpoint<{ song: string }, unknown>({
  method: 'post',
  url: '/add-song-to-queue',
  handler: async (req, res) => {
    const { song } = req.body
    const { addSongToQueue } = await import('@shared/lib/session/queue')
    await addSongToQueue(song)
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
