import { createMessage } from '@shared/types/messages'

export const queueChanged = createMessage<unknown, unknown>({
  event: 'queue:changed'
})
