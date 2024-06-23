import { type QueueInsert } from '@shared/db/schema'

export async function getQueueForCurrentSession() {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { eq, asc } = await import('drizzle-orm')
  const { getCurrentSession } = await import('./index')

  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('no current session!')
  }

  const result = await db
    .select()
    .from(queue)
    .where(eq(queue.sessionId, currentSession.id))
    .orderBy(asc(queue.order))

  return result
}

async function getLastItemInQueue(sessionId: number) {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { desc, eq } = await import('drizzle-orm')

  try {
    const [lastItem] = await db
      .select()
      .from(queue)
      .where(eq(queue.sessionId, sessionId))
      .orderBy(desc(queue.order))
      .limit(1)

    return lastItem
  } catch {
    return
  }
}

export async function addSongToQueue(song: string) {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { getCurrentSession } = await import('./index')

  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('no current session!')
  }

  const lastItemInQueue = await getLastItemInQueue(currentSession.id)

  const newQueueItem: QueueInsert = {
    song,
    sessionId: currentSession.id,
    order: (lastItemInQueue?.order ?? 0) + 1
  }

  const result = await db
    .insert(queue)
    .values(newQueueItem)
    .returning({ id: queue.id, songTitle: queue.song })

  return result
}

export async function removeSongFromQueue(queueId: number) {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { eq } = await import('drizzle-orm')

  await db.delete(queue).where(eq(queue.id, queueId))
}

export async function reorderQueue(queueItems: { id: number; order: number }[]) {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { eq } = await import('drizzle-orm')
  const { getCurrentSession } = await import('./index')

  const currentSession = await getCurrentSession()

  const lastItemInQueue = await getLastItemInQueue(currentSession.id)

  const offset = (lastItemInQueue?.order ?? 0) + 1

  await Promise.all(
    queueItems.map(({ id, order }) =>
      db
        .update(queue)
        .set({ order: order + offset })
        .where(eq(queue.id, id))
    )
  )
}

export async function clearQueue() {
  const { db } = await import('@shared/db')
  const { queue } = await import('@shared/db/schema')
  const { eq } = await import('drizzle-orm')
  const { getCurrentSession } = await import('./index')

  const currentSession = await getCurrentSession()

  return db.delete(queue).where(eq(queue.sessionId, currentSession.id))
}
