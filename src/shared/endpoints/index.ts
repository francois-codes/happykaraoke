import { loginUser, fetchUser, joinSession } from './user'
import { getSong, getSongsList, changeSong, setTranspo } from './song'
import { setScroll } from './scroll'
import { closeSession, fetchSessionConfig, fetchSessionLog, setSongsFolder } from './session'
import { addToQueue, getQueue, removeFromQueue, reorderQueue, clearQueue } from './queue'

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
  setSongsFolder,
  fetchSessionLog,
  closeSession,
  getQueue,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  clearQueue
]
