import { SearchQuery } from './SearchQuery'
import { SearchMode, SongSearchData } from './types'
import { sanitizeSearchString } from './utils'

const keywords = ['author', 'title', 'tag']

function intersect(array1: string[], array2: string[]): string[] {
  const set2 = new Set(array2)
  return array1.filter((value) => set2.has(value))
}

export class KeywordSearch implements SearchMode {
  matches(query: SearchQuery): boolean {
    return intersect(Object.keys(query.keywords), keywords).length > 0
  }

  search(query: SearchQuery, songs: SongSearchData[]): SongSearchData[] {
    return songs.filter((song) => {
      return keywords.every((keyword) => {
        const titlesMatches = query.content
          ? sanitizeSearchString(song.title).includes(query.content)
          : true

        if (!query.keywords[keyword]) return titlesMatches

        const value = query.keywords[keyword].toLowerCase()
        if (keyword === 'tag') {
          return song.tags.some((tag) => sanitizeSearchString(tag).includes(value)) && titlesMatches
        }

        return sanitizeSearchString(song[keyword]).includes(value) && titlesMatches
      })
    })
  }
}
