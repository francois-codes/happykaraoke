import { readdirSync } from 'fs'
import { Song } from '../song/song'
import { getSessionConfig } from '../session'
import { Search } from '../search'

const getSongFiles = () => {
  try {
    return readdirSync(getSessionConfig().songsFolder)
  } catch {
    return []
  }
}

const EXCLUDED_FILES = ['.DS_Store', '_old', '.', '..', 'Icon']

export function getAllSongs() {
  return getSongFiles()
    .flatMap((file) => {
      if (EXCLUDED_FILES.includes(file)) return []
      try {
        const filename = file.replace('.txt', '')
        const song = new Song(filename)
        const songData = song.load()

        return { ...songData, filename }
      } catch (e) {
        console.error('Error loading song: ', file)
        return []
      }
    })
    .map(({ author, title, tags, filename }) => ({ author, title, tags, filename }))
    .sort((a, b) => {
      return (
        a.author.localeCompare(b.author, 'fr', { ignorePunctuation: true }) ||
        a.title.localeCompare(b.title, 'fr', { ignorePunctuation: true })
      )
    })
}

export function searchSong(query: string, allSongs = getAllSongs()) {
  const search = new Search(query, allSongs)
  return search.execute()
}
