import { SearchMode, SongSearchData } from './types'
import { sanitizeSearchString } from './utils'

export class DefaultSearch implements SearchMode {
  matches(): boolean {
    return true
  }

  search(query, songs: SongSearchData[]): SongSearchData[] {
    const normalizedQuery = sanitizeSearchString(query.content)

    const results = songs
      .flatMap(({ author, title, tags, filename }) => {
        let match = 0
        const authorNormalized = sanitizeSearchString(author)
        const titleNormalized = sanitizeSearchString(title)

        if (tags.some((tag) => sanitizeSearchString(tag).includes(normalizedQuery))) {
          match += 1
        }

        if (
          authorNormalized.includes(normalizedQuery) ||
          titleNormalized.includes(normalizedQuery)
        ) {
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
}
