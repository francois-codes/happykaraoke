import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { DraggableItem, ItemType } from './Item'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'
import { reorderQueue } from '@shared/endpoints/queue'

export function DraggableList({
  items: initialItems,
  onSave
}: {
  items: ItemType[]
  onSave: () => void
}) {
  const [items, setItems] = useState<ItemType[]>(initialItems)
  const [activeItem, setActiveItem] = useState<null | ItemType>(null)
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor))

  function onDragStart({ active }) {
    const activeItem = active.data.current.item as ItemType
    setActiveItem(activeItem)
  }

  function onDragOver({ active, over }) {
    setItems((items) => {
      const activeIndex = items.findIndex((i) => i.id === active?.id)
      const overIndex = items.findIndex((i) => i.id === over?.id)

      return arrayMove(items, activeIndex, overIndex)
    })
  }

  async function onDragEnd() {
    const orderQueuePayload = items.map((item, index) => ({
      id: item.id as number,
      order: index
    }))

    await reorderQueue.call({ queue: orderQueuePayload })
    onSave()
  }

  const itemIds = useMemo(() => items.map(({ id }) => id), [items])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={itemIds}>
        {items.map((item) => (
          <DraggableItem key={item.id} item={item} onSave={onSave} />
        ))}
      </SortableContext>
      {'document' in window &&
        createPortal(
          <DragOverlay>
            {activeItem && <DraggableItem onSave={onSave} item={activeItem} isOverlay />}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  )
}
