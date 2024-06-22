import type { UniqueIdentifier } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { cva } from 'class-variance-authority'
import { GripVertical } from 'lucide-react'
import { Button } from '../ui/button'
import { IoTrashBinOutline } from 'react-icons/io5'
import { removeFromQueue } from '@shared/endpoints/queue'

export interface ItemType {
  id: UniqueIdentifier
  content: string
}

export interface ItemProps {
  item: ItemType
  isOverlay?: boolean
  onSave: () => void
}

export interface ItemDragData {
  item: ItemType
}

export function DraggableItem({ item, isOverlay, onSave }: ItemProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      item
    } satisfies ItemDragData,
    attributes: {
      roleDescription: 'Task'
    }
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform)
  }

  const variants = cva('', {
    variants: {
      dragging: {
        over: 'ring-2 opacity-30',
        overlay: 'ring-2 ring-primary'
      }
    }
  })

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={variants({
        dragging: isOverlay ? 'overlay' : isDragging ? 'over' : undefined
      })}
    >
      <CardContent className="px-3 py-3 text-left whitespace-pre-wrap flex flex-row items-center space-between gap-2">
        <div className="flex flex-row gap-2 grow">
          <Button
            variant={'ghost'}
            {...attributes}
            {...listeners}
            className="p-1 text-secondary-foreground/50 -ml-2 h-auto cursor-grab"
          >
            <GripVertical />
          </Button>
          <div className="leading-[32px]">{item.content}</div>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await removeFromQueue.call({ queueId: item.id as number })
            onSave()
          }}
        >
          <IoTrashBinOutline />
        </Button>
      </CardContent>
    </Card>
  )
}
