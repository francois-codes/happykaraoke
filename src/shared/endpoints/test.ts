import { pingMessage } from '@shared/messages/test'
import { createEndpoint } from '@shared/types/endpoints'

export const testEndpoint = createEndpoint<unknown, { message: string }>({
  method: 'get',
  url: '/test',
  handler: (_, res) => {
    res.status(200).json({ message: 'Hello from server' })
  }
})

export const sendPingRequest = createEndpoint<{ pingValue: number }, { response: string }>({
  method: 'post',
  url: '/send-ping',
  handler: (req, res) => {
    const { pingValue } = req.body

    res.status(200).json({ response: `Pong! You sent ${pingValue}` })
    setTimeout(() => {
      pingMessage.server.emit({ pingValue: pingValue + 1 })
    }, 1000)
  }
})
