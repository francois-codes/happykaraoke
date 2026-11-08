import { addToQueue, clearQueue, getQueue, removeFromQueue, reorderQueue } from './queue'
import { releaseScrollMaster, takeScrollMaster } from './scrollControl'
import { setScrollSnapshot } from './scroll'
import { closeSession, deleteSessionLog, fetchAllSessions, fetchSessionConfig, fetchSessionLog, refreshSession, setSongsFolder } from './session'
import { changeSong, getCSVData, getSong, getSongsList, setTranspo } from './song'
import { fetchUser, joinSession, loginUser } from './user'
import { generateSong, getOpenAIKey, saveSong, setOpenAIKey } from './ai'
import { fetchGridFlags, flagSong, setGridFlagNoteEndpoint, undoFlagSong, unflagSong } from './gridFlags'

export const endpoints = [
  loginUser,
  fetchUser,
  joinSession,
  getSong,
  getSongsList,
  getCSVData,
  changeSong,
  setTranspo,
  setScrollSnapshot,
  takeScrollMaster,
  releaseScrollMaster,
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
  clearQueue,
  setOpenAIKey,
  getOpenAIKey,
  generateSong,
  saveSong,
  flagSong,
  undoFlagSong,
  unflagSong,
  setGridFlagNoteEndpoint,
  fetchGridFlags
]
