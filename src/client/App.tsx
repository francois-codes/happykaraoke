import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './assets/main.css'
import { shared } from '@shared/utils'

const socket = io()

shared()

export default function App() {
  const [apiResponse, setApiResponse] = useState('loading...')
  const [socketResponse, setSocketResponse] = useState('loading...')

  async function fetchRequest() {
    const response = await fetch('/api')
    const result = await response.json()

    setApiResponse(result.message)
  }

  async function socketRequest() {
    const response = await socket.emitWithAck('message', {
      inbound: 'from client'
    })

    setSocketResponse(response.message)
  }

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
