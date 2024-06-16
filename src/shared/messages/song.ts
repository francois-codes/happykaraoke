import { createMessage } from '@shared/types/messages'

export const songChanged = createMessage<{ title: string }, unknown>({
  event: 'song:changed'
})

export const transpoChanged = createMessage<{ transpo: number }, unknown>({
  event: 'transpo:changed'
})

export const songFileChanged = createMessage<{ filename: string }, unknown>({
  event: 'song-file:changed'
})
