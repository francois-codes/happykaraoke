import { createMessage } from '@shared/types/messages'
import type { ScrollControlSnapshot } from '@shared/lib/session'
import type { ScrollSnapshot } from '@shared/types/scroll'

export const scrollSnapshotChanged = createMessage<ScrollSnapshot, unknown>({
  event: 'scroll:snapshot:changed'
})

export const scrollControlState = createMessage<ScrollControlSnapshot, unknown>({
  event: 'scroll:control:state'
})
