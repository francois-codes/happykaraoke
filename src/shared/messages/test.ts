import { createMessage } from '@shared/types/messages'

export const testMessage = createMessage<{ inbound: string }, { message: string }>({
  event: 'test',
  handler: (payload, callback) => {
    console.log('message: ', payload)
    callback({ message: 'received: ' + payload.inbound })
  }
})

export const pingMessage = createMessage<{ pingValue: number }, { response: string }>({
  event: 'ping'
})
