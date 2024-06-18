import { readdirSync } from 'fs'
import { Song } from '../song/song'
import { getSessionConfig } from '../session'

const getSongFiles = () => {
  try {
    return readdirSync(getSessionConfig().songsFolder)
  } catch {
    return []
  }
}

const EXCLUDED_FILES = ['.DS_Store', '_old', '.', '..', 'Icon']

const sanitizeSearchString = (query: string) =>
  query
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')

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
}

export function searchSong(query: string, allSongs = getAllSongs()) {
  const normalizedQuery = sanitizeSearchString(query)

  const results = allSongs
    .flatMap(({ author, title, tags, filename }) => {
      let match = 0
      const authorNormalized = sanitizeSearchString(author)
      const titleNormalized = sanitizeSearchString(title)

      if (tags.some((tag) => sanitizeSearchString(tag).includes(normalizedQuery))) {
        match += 1
      }

      if (authorNormalized.includes(normalizedQuery) || titleNormalized.includes(normalizedQuery)) {
        match += 2
      }

      if (titleNormalized.includes(normalizedQuery)) {
        match += 3
      }

      if (titleNormalized.startsWith(normalizedQuery)) {
        match += 1
      }

      if (authorNormalized.startsWith(normalizedQuery)) {
        match += 2
      }

      if (match > 0) return { author, title, match, filename, tags }

      return []
    })
    .sort((a, b) => {
      if (!a || !b) return 0
      if (a.match > b.match) return -1
      if (a.author > b.author) return 1
      if (a.title > b.title) return 1

      return 0
    })

  return results
}
