import type { Request, Response, Express } from 'express'
import axios from 'axios'

// @ts-expect-error - this is fine
interface TypedRequest<Payload> extends Request {
  body: Payload
  params: Payload
}

interface TypedResponse<Payload> extends Response {
  json: (payload: Payload) => this
}

type Method = 'get' | 'post' | 'put' | 'delete'

export type Endpoint<Payload, ResponsePayload> = ReturnType<
  typeof createEndpoint<Payload, ResponsePayload>
>

export function createEndpoint<Payload, ResponsePayload>({
  method,
  url,
  handler
}: {
  method: Method
  url: string
  handler: (req: TypedRequest<Payload>, res: TypedResponse<ResponsePayload>) => void
}) {
  function register(app: Express) {
    app[method](url, handler)
  }
  async function call(payload?: Payload) {
    const { data } = await axios<ResponsePayload>({
      method,
      url,
      data: method === 'post' ? payload : undefined,
      params: method === 'get' ? payload : undefined
    })

    return data
  }

  return {
    register,
    call
  }
}
