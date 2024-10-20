import { scrollChanged } from '@shared/messages/scroll';
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
