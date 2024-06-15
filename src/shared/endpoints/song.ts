import { getAllSongs } from '@shared/lib/data/songs'
import { Song } from '@shared/lib/song/song'
import { songChanged } from '@shared/messages/song'
import { SongData } from '@shared/types'
import { createEndpoint } from '@shared/types/endpoints'

export const getSong = createEndpoint<{ title: string }, { song: SongData }>({
  method: 'get',
  url: '/song',
  handler: async (req, res) => {
    const { title } = req.params
    const song = new Song(title)
    const data = song.load()

    res.status(200).json({ song: data })
  }
})

export const getSongsList = createEndpoint<
  unknown,
  { songs: { title: string; author: string; fileName: string; tags: string[] }[] }
>({
  method: 'get',
  url: '/songs',
  handler: async (_, res) => {
    const songs = getAllSongs()
    res.status(200).json({ songs })
  }
})

export const changeSong = createEndpoint<{ title: string }, unknown>({
  method: 'post',
  url: '/set-song',
  handler: async (req, res) => {
    const { title } = req.body
    songChanged.server.emit({ title })

    res.status(200)
  }
})
