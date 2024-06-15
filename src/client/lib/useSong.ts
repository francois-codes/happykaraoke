import { useDispatch } from '@/store'
import { getSong } from '@shared/endpoints/song'
import { SongData } from '@shared/types'

import { useEffect, useState } from 'react'

export const useSong = (title?: string) => {
  const [song, setSong] = useState<SongData | undefined>(undefined)
  const dispatch = useDispatch()

  async function fetchSong(title: string) {
    const { song } = await getSong.call({ title })
    if (!song) return
    setSong(song)
    dispatch({ songKey: song.key })
  }

  useEffect(() => {
    if (title) fetchSong(title)
  }, [title])

  return { song, reload: () => title && fetchSong(title) }
}
