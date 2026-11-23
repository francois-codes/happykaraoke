import { createMessage } from '@shared/types/messages'

/** The soirée being recorded started (startedAt) or stopped (null): keeps every admin's ▶/■ button in sync. */
export const soireeChanged = createMessage<{ startedAt: string | null }, unknown>({
  event: 'soiree:changed'
})
