import { getAllSongs } from '@shared/lib/data/songs'
import { setSessionConfig } from '@shared/lib/session'
import { Song } from '@shared/lib/song/song'
import { songChanged, transpoChanged } from '@shared/messages/song'
import { SongData } from '@shared/types'
import { createEndpoint } from '@shared/types/endpoints'

export const getSong = createEndpoint<{ title: string }, { song: SongData }>({
  method: 'get',
  url: '/song',
  handler: async (req, res) => {
    const { title } = req.query
    const song = new Song(title)
    try {
      const data = song.load()
      res.status(200).json({ song: data })
    } catch (e) {
      res.sendStatus(500)
    }
  }
})

export const getSongsList = createEndpoint<
  unknown,
  { songs: { title: string; author: string; filename: string; tags: string[] }[] }
>({
  method: 'get',
  url: '/songs',
  handler: async (_, res) => {
    try {
      const songs = getAllSongs()
      res.status(200).json({ songs })
    } catch (e) {
      res.sendStatus(500)
    }
  }
})

export const changeSong = createEndpoint<{ title: string }, unknown>({
  method: 'post',
  url: '/set-song',
  handler: async (req, res) => {
    const { title } = req.body
    songChanged.server.emit({ title })
    transpoChanged.server.emit({ transpo: 0 })
    setSessionConfig({ currentSong: title, transpo: 0 })

    res.sendStatus(200)
  }
})

export const setTranspo = createEndpoint<{ transpo: number }, unknown>({
  method: 'post',
  url: '/set-transpo',
  handler: async (req, res) => {
    const { transpo } = req.body
    setSessionConfig({ transpo })
    transpoChanged.server.emit({ transpo })

    res.sendStatus(200)
  }
})
