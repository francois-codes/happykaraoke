import { useEffect, useRef, useState } from 'react'
import { clearQueue, getQueue, removeFromQueue } from '@shared/endpoints/queue'
import { DraggableList, DraggableRef, ItemType } from '../Draggable'
import { queueChanged } from '@shared/messages/queue'
import { socket } from '@/utils/socket'
import { changeSong } from '@shared/endpoints/song'
import { ButtonWithConfirmAction } from '../ButtonWithConfirmAction'

export function SessionQueue({ maxHeight }: { maxHeight: string }) {
  const [hasItems, setHasItems] = useState(false)
  const draggableRef = useRef<DraggableRef>(null)

  async function fetchQueueItems() {
    const { queue } = await getQueue.call()
    setHasItems(queue.length > 0)
    draggableRef.current?.setListItems(
      queue.map(({ id, song, user }) => ({ id, content: song, user }))
    )
  }

  async function emptyQueue() {
    await clearQueue.call()
    fetchQueueItems()
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
    <div className={`flex flex-grow flex-col gap-2 overflow-scroll p-2 ${maxHeight}`}>
      <DraggableList
        ref={draggableRef}
        onItemClick={onItemClick}
        refresh={fetchQueueItems}
        emptyState={<p className="lg:invisible">Aucune chanson en attente</p>}
      />
      {hasItems && (
        <ButtonWithConfirmAction
          title="Etes-vous sur ?"
          desc="la file d'attente sera vidée. Cette action ne peux pas être annulée"
          label="Vider la file"
          onClick={emptyQueue}
          className="w-full"
        >
          Oui, vider la file
        </ButtonWithConfirmAction>
      )}
    </div>
  )
}
