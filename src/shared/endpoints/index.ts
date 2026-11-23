import { addToQueue, clearQueue, getQueue, removeFromQueue, reorderQueue } from './queue'
import { releaseScrollMaster, takeScrollMaster } from './scrollControl'
import { setScrollSnapshot } from './scroll'
import { closeSession, deleteSessionLog, fetchAllSessions, fetchSessionConfig, fetchSessionLog, refreshSession, setSongsFolder } from './session'
import { changeSong, getCSVData, getSong, getSongsList, setTranspo } from './song'
import { fetchUser, joinSession, loginUser } from './user'
import { fetchGridEditorStatus, importUltimateGuitar } from './gridEditor'
import { getCoverImage, setCover } from './cover'
import { fetchGridFlags, flagSong, setGridFlagNoteEndpoint, undoFlagSong, unflagSong } from './gridFlags'
import {
  cancelSoireeEndpoint,
  createLiveFromLog,
  deleteLive,
  fetchDayLog,
  fetchLiveCandidates,
  ignoreLiveCandidate,
  fetchCurrentSoiree,
  fetchSoiree,
  fetchSoirees,
  startSoireeEndpoint,
  stopSoireeEndpoint,
  updateSoireeEndpoint
} from './soirees'

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
  setCover,
  getCoverImage,
  flagSong,
  undoFlagSong,
  unflagSong,
  setGridFlagNoteEndpoint,
  fetchGridFlags,
  fetchCurrentSoiree,
  startSoireeEndpoint,
  stopSoireeEndpoint,
  cancelSoireeEndpoint,
  fetchSoirees,
  fetchSoiree,
  updateSoireeEndpoint,
  fetchLiveCandidates,
  ignoreLiveCandidate,
  createLiveFromLog,
  deleteLive,
  fetchDayLog,
  fetchGridEditorStatus,
  importUltimateGuitar
]
