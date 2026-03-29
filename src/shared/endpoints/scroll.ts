import { scrollSnapshotChanged } from '@shared/messages/scroll'
import { upsertScrollSnapshot } from '@shared/lib/session'
import { createEndpoint } from '@shared/types/endpoints'
import type { ScrollSnapshot, ScrollSnapshotInput } from '@shared/types/scroll'

export const setScrollSnapshot = createEndpoint<ScrollSnapshotInput, ScrollSnapshot | { message: string }>({
  method: 'post',
  url: '/scroll-snapshot',
  handler: async (req, res) => {
    const result = await upsertScrollSnapshot(req.body)
    if (!result.ok) {
      res.status(result.status).json({ message: result.message })
      return
    }

    scrollSnapshotChanged.server.emit(result.snapshot)
    res.status(200).json(result.snapshot)
  }
})
