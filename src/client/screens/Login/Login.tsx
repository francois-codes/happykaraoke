import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'

export function Login() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(true)
  }, [])

  return (
    <div
      className={`flex flex-col items-center justify-center h-[calc(100vh-56px)] py-2 gap-12 fade-in ${open ? 'open' : ''}`}
    >
      <h1 className="text-3xl font-bold">HappiKaraoke 🎙️ 🎸 🎹 🥁</h1>
      <Outlet />
    </div>
  )
}
