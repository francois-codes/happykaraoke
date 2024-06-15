import { CreateSession } from './CreateSession'
import { JoinSession } from './JoinSession'

export const LOGIN_TABS = [
  {
    value: 'create_session',
    title: 'Create Session',
    description: 'Open a new session which other uses can join',
    Component: CreateSession
  },
  {
    value: 'join_session',
    title: 'Join Session',
    description: 'Join an existing session to sing along with others',
    Component: JoinSession
  }
]
