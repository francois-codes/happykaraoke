import { addToQueue, clearQueue, getQueue, removeFromQueue, reorderQueue } from './queue'
import { enableScrollMaster, setScroll } from './scroll'
import { closeSession, deleteSessionLog, fetchAllSessions, fetchSessionConfig, fetchSessionLog, refreshSession, setSongsFolder } from './session'
import { changeSong, getCSVData, getSong, getSongsList, setTranspo } from './song'
import { fetchUser, joinSession, loginUser } from './user'

export const endpoints = [
  loginUser,
  fetchUser,
  joinSession,
  getSong,
  getSongsList,
  getCSVData,
  changeSong,
  setTranspo,
  setScroll,
  enableScrollMaster,
  fetchSessionConfig,
  setSongsFolder,
  fetchSessionLog,
  fetchAllSessions,
  deleteSessionLog,
  closeSession,
  refreshSession,
  getQueue,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  clearQueue
]
