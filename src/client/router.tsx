import { createBrowserRouter, redirect } from 'react-router-dom'
import { Login } from '@/screens/Login'
import { CreateSession } from '@/screens/Login/CreateSession'
import { JoinSession } from '@/screens/Login/JoinSession'
import { SessionScreen } from '@/screens/session'
import { SessionError } from './screens/session/error'

export const router = createBrowserRouter([
  {
    path: '/',
    loader: ({ request }) => {
      const url = new URL(request.url)
      if (!url.pathname.includes('join') && url.searchParams.get('join') !== null) {
        return redirect('/join')
      }
      return null
    },
    element: <Login />,
    children: [
      { path: '/', element: <CreateSession /> },
      { path: '/join', element: <JoinSession /> }
    ]
  },
  {
    path: '/session',
    element: <SessionScreen />,
    errorElement: <SessionError />
  }
])
