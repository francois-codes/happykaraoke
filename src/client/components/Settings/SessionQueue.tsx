import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Button } from '../ui/button'
import { useEffect, useRef, useState } from 'react'
import { type QueueType } from '@shared/db/schema'
import { getQueue } from '@shared/endpoints/queue'
import { DraggableList } from '../Draggable'
import { IoPlayCircleOutline } from 'react-icons/io5'

export function SessionQueue() {
  const keyRef = useRef(1)
  const [open, setOpen] = useState(false)
  const [queueItems, setQueueItems] = useState<QueueType[]>([])

  async function fetchQueueItems() {
    const { queue } = await getQueue.call()

    setQueueItems(queue)
    keyRef.current += 1
  }

  useEffect(() => {
    fetchQueueItems()
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <IoPlayCircleOutline />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Prochaines chansons</DialogTitle>
          <DialogDescription>Liste des prochaines chansons</DialogDescription>
        </DialogHeader>

        <div className="flex flex-grow flex-col gap-2">
          {queueItems.length ? (
            <DraggableList
              key={keyRef.current}
              onSave={fetchQueueItems}
              items={queueItems.map(({ id, song }) => ({ id, content: song }))}
            />
          ) : (
            <p>Aucune chanson en attente</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
