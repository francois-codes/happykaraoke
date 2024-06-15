import { createBrowserRouter } from 'react-router-dom'
import { Login } from '@/screens/Login'
import { CreateSession } from '@/screens/Login/CreateSession'
import { JoinSession } from '@/screens/Login/JoinSession'
import { SessionScreen } from '@/screens/session'
import { SessionError } from './screens/session/error'

export const router = createBrowserRouter([
  {
    path: '/',
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
