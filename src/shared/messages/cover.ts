import type { CoverState } from '@shared/types/cover'
import { createMessage } from '@shared/types/messages'

export const coverChanged = createMessage<{ cover: CoverState | null }, unknown>({
  event: 'cover:changed'
})
