import {
  type ScrollControlSnapshot,
  scrollControlRelease,
  scrollControlTake
} from '@shared/lib/session'
import { scrollControlState } from '@shared/messages/scroll'
import { createEndpoint } from '@shared/types/endpoints'

function emitScrollSnapshot(snapshot: ScrollControlSnapshot) {
  scrollControlState.server.emit(snapshot)
}

type UserIdBody = { userId: number }

export const takeScrollMaster = createEndpoint<UserIdBody, ScrollControlSnapshot>({
  method: 'post',
  url: '/scroll-control/take',
  handler: async (req, res) => {
    const { userId } = req.body
    const result = await scrollControlTake(userId)
    if (!result.ok) {
      res.status(result.status).json({ message: result.message })
      return
    }
    emitScrollSnapshot(result.snapshot)
    res.status(200).json(result.snapshot)
  }
})

export const releaseScrollMaster = createEndpoint<UserIdBody, ScrollControlSnapshot>({
  method: 'post',
  url: '/scroll-control/release',
  handler: async (req, res) => {
    const { userId } = req.body
    const result = await scrollControlRelease(userId)
    if (!result.ok) {
      res.status(result.status).json({ message: result.message })
      return
    }
    emitScrollSnapshot(result.snapshot)
    res.status(200).json(result.snapshot)
  }
})
