import { useEffect, useState } from 'react'
import './assets/main.css'
import { sendPingRequest, testEndpoint } from '@shared/endpoints/test'
import { pingMessage, testMessage } from '@shared/messages/test'
import { socket } from '@/utils/socket'
import { useDispatch, useStore } from '@/store'

export default function App() {
  const [apiResponse, setApiResponse] = useState('loading...')
  const [socketResponse, setSocketResponse] = useState('loading...')
  const [pingValue, setPingValue] = useState<number | null>(null)

  const { currentSong } = useStore()
  const dispatch = useDispatch()

  async function fetchRequest() {
    const response = await testEndpoint.call()

    setApiResponse(response.message)
  }

  async function socketRequest() {
    const response = await testMessage.client.emitWithAck(socket, {
      inbound: 'from client'
    })

    setSocketResponse(response.message)
  }

  function sendPing() {
    sendPingRequest.call({ pingValue: 5 })
  }

  function setSong() {
    dispatch({ currentSong: 'yo' })
  }

  pingMessage.client.useMessage(socket, (payload) => {
    setPingValue(payload.pingValue)
  })

  useEffect(() => {
    fetchRequest()
    socketRequest()
  }, [])

  return (
    <>
      <div className="bg-slate-100 dark:bg-slate-900 flex flex-col min-h-screen justify-between">
        <div id="scroll-container" className="h-[calc(100vh-56px)] overflow-scroll">
          <div>
            <h1>Hello</h1>
            <p>request: {apiResponse}</p>
            <p>socket: {socketResponse}</p>
            <button onClick={sendPing}>send ping</button>
            <p>Ping value received: {pingValue || 'waiting...'}</p>
            <p>CurrentSong: {currentSong || 'not defined'}</p>
            <button onClick={setSong}>set song</button>
          </div>
        </div>
        <div className="bottom-0 py-4 grid text-center w-full">
          <footer>
            <p>&copy; {new Date().getFullYear()} - Happi Karaoké</p>
          </footer>
        </div>
      </div>
    </>
  )
}
