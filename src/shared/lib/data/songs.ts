import { sessionLog } from '@shared/db/schema'
import { readdirSync } from 'fs'
import { Search } from '../search'
import { getSessionConfig } from '../session'
import { Song } from '../song/song'

const getSongFiles = () => {
  try {
    return readdirSync(getSessionConfig().songsFolder)
  } catch {
    return []
  }
}

// `images` holds the cover images (see coverImages.ts), not songs.
const EXCLUDED_FILES = ['.DS_Store', '_old', '.', '..', 'Icon', 'images']

export function getAllSongs(opts: { withKey?: boolean } = { withKey: false }) {
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
    .map(({ author, key, title, tags, filename }) => {
      if (opts.withKey) {
        return { author, key, title, tags, filename }
      }

      return { author, title, tags, filename }
    })
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

export async function getSongStats() {
  const { db } = await import('@shared/db')
  const { sql } = await import('drizzle-orm')

  const songCounts = await db
    .select({
      songTitle: sessionLog.song,
      count: sql<number>`count(*)`.as('count')
    })
    .from(sessionLog)
    .groupBy(sessionLog.song)
    .orderBy(sql`count(*) DESC`)

  return songCounts
}
