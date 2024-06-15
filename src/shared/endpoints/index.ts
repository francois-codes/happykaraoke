import { loginUser, fetchUser, joinSession } from './user'
import { getSong, getSongsList, changeSong, setTranspo } from './song'
import { setScroll } from './scroll'
import { fetchSessionConfig, setSongsFolder } from './session'

export const endpoints = [
  loginUser,
  fetchUser,
  joinSession,
  getSong,
  getSongsList,
  changeSong,
  setTranspo,
  setScroll,
  fetchSessionConfig,
  setSongsFolder
]
