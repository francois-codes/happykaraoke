import './assets/main.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useRef } from 'react'
import { ScrollProvider } from './contexts/scroll'

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <div className="bg-slate-100 dark:bg-slate-900 flex flex-col min-h-screen justify-between">
        <div ref={scrollRef} id="scroll-container" className="h-[calc(100vh-56px)] overflow-scroll">
          <ScrollProvider scrollRef={scrollRef}>
            <RouterProvider router={router} />
          </ScrollProvider>
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
