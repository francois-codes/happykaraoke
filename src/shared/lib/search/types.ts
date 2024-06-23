import { SearchQuery } from './SearchQuery'

export interface SongSearchData {
  title: string
  author: string
  tags: string[]
  filename: string
}

export abstract class SearchMode {
  abstract matches(query: SearchQuery): boolean
  abstract search(query: SearchQuery, songs: SongSearchData[]): SongSearchData[]
}
