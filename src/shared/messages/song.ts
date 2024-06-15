import { createMessage } from '@shared/types/messages'

export const songChanged = createMessage<{ title: string }, unknown>({
  event: 'song:changed'
})
