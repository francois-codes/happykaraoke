import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { type ReactElement, Ref, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { DraggableItem, ItemType } from './Item'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'
import { reorderQueue } from '@shared/endpoints/queue'

interface Props {
  emptyState: ReactElement
  onItemClick: (args: { item: ItemType; action: string }) => void
  refresh: () => void
}

export interface DraggableRef {
  setListItems: (items: ItemType[]) => void
}

function DraggableListComponent(
  { emptyState, onItemClick, refresh }: Props,
  ref: Ref<DraggableRef>
) {
  const [items, setItems] = useState<ItemType[]>([])
  const [activeItem, setActiveItem] = useState<null | ItemType>(null)
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor))

  useImperativeHandle<DraggableRef, DraggableRef>(
    ref,
    () => ({
      setListItems: setItems
    }),
    []
  )

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
    refresh()
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
        {items.length ? (
          <>
            {items.map((item) => (
              <DraggableItem key={item.id} item={item} onClick={onItemClick} />
            ))}
          </>
        ) : (
          <>{emptyState}</>
        )}
      </SortableContext>
      {'document' in window &&
        createPortal(
          <DragOverlay>
            {activeItem && <DraggableItem onClick={onItemClick} item={activeItem} isOverlay />}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  )
}

export const DraggableList = forwardRef<DraggableRef, Props>(DraggableListComponent)
