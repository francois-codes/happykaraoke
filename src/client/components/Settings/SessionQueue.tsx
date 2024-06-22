import { useEffect, useRef, useState } from 'react'
import { type QueueType } from '@shared/db/schema'
import { getQueue } from '@shared/endpoints/queue'
import { DraggableList } from '../Draggable'
import { queueChanged } from '@shared/messages/queue'
import { socket } from '@/utils/socket'

export function SessionQueue() {
  const keyRef = useRef(1)
  const [queueItems, setQueueItems] = useState<QueueType[]>([])

  async function fetchQueueItems() {
    const { queue } = await getQueue.call()

    setQueueItems(queue)
    keyRef.current += 1
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
          key={keyRef.current}
          onSave={fetchQueueItems}
          items={queueItems.map(({ id, song }) => ({ id, content: song }))}
        />
      ) : (
        <p className="lg:invisible">Aucune chanson en attente</p>
      )}
    </div>
  )
}
