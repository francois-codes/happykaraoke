import { loginUser, fetchUser, joinSession } from './user'
import { getSong, getSongsList, changeSong } from './song'
import { setScroll } from './scroll'

export const endpoints = [
  loginUser,
  fetchUser,
  joinSession,
  getSong,
  getSongsList,
  changeSong,
  setScroll
]
