import { scrollChanged, scrollMasterEnabled } from '@shared/messages/scroll';
import { createEndpoint } from '@shared/types/endpoints';
import { ScrollEventType } from '@shared/types/scroll';

type ScrollChangePayload = { type: ScrollEventType; value?: number }

export const setScroll = createEndpoint<ScrollChangePayload, unknown>({
  method: 'post',
  url: '/scroll',
  handler: async (req, res) => {
    const { type, value } = req.body
    scrollChanged.server.emit({ type, value })
    res.sendStatus(200)
  }
})

export const enableScrollMaster = createEndpoint<{ userId: string }, unknown>({
  method: 'post',
  url: '/scroll-master',
  handler: async (req, res) => {
    const { userId } = req.body
    scrollMasterEnabled.server.emit({ userId })
    res.sendStatus(200)
  }
})
