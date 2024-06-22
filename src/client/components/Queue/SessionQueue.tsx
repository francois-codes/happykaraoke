import { useEffect, useRef, useState } from 'react'
import { type QueueType } from '@shared/db/schema'
import { getQueue, removeFromQueue } from '@shared/endpoints/queue'
import { DraggableList, ItemType } from '../Draggable'
import { queueChanged } from '@shared/messages/queue'
import { socket } from '@/utils/socket'
import { changeSong } from '@shared/endpoints/song'

export function SessionQueue() {
  const key = useRef(0)
  const [queueItems, setQueueItems] = useState<QueueType[]>([])

  async function fetchQueueItems() {
    const { queue } = await getQueue.call()

    setQueueItems(queue)
    key.current += 1
  }

  async function onItemClick({ item, action }: { item: ItemType; action: string }) {
    switch (action) {
      case 'play':
        await changeSong.call({ title: item.content })
        await removeFromQueue.call({ queueId: item.id as number })
        fetchQueueItems()
        break
      case 'remove':
        await removeFromQueue.call({ queueId: item.id as number })
        fetchQueueItems()
        break
    }
  }

  queueChanged.client.useMessage(socket, () => {
    fetchQueueItems()
  })

  useEffect(() => {
    fetchQueueItems()
  }, [])

  return (
    <div className="flex flex-grow flex-col gap-2 overflow-scroll max-h-[calc(100vh-280px)]">
      {queueItems.length ? (
        <DraggableList
          key={key.current}
          onItemClick={onItemClick}
          refresh={fetchQueueItems}
          items={queueItems.map(({ id, song }) => ({ id, content: song }))}
        />
      ) : (
        <p className="lg:invisible">Aucune chanson en attente</p>
      )}
    </div>
  )
}
