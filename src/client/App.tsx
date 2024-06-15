import './assets/main.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return (
    <>
      <div className="bg-slate-100 dark:bg-slate-900 flex flex-col min-h-screen justify-between">
        <div id="scroll-container" className="h-[calc(100vh-56px)] overflow-scroll">
          <RouterProvider router={router} />
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
