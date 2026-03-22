import { createMessage } from '@shared/types/messages'
import type { ScrollControlSnapshot } from '@shared/lib/session'
import { ScrollEventType } from '@shared/types/scroll'

export const scrollChanged = createMessage<{ type: ScrollEventType; value?: number }, unknown>({
  event: 'scroll:changed'
})

export const scrollControlState = createMessage<ScrollControlSnapshot, unknown>({
  event: 'scroll:control:state'
})
