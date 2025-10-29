import { createMessage } from '@shared/types/messages';
import { ScrollEventType } from '@shared/types/scroll';

export const scrollChanged = createMessage<{ type: ScrollEventType; value?: number }, unknown>({
  event: 'scroll:changed'
})

export const scrollMasterEnabled = createMessage<{ userId: string }, unknown>({
  event: 'scroll:master:enabled'
})
