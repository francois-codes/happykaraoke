import { DefaultSearch } from './DefaultSearch'
import { KeywordSearch } from './KeywordSearch'
import { SearchQuery } from './SearchQuery'
import { SearchMode, SongSearchData } from './types'

const SearchModes: SearchMode[] = [new KeywordSearch(), new DefaultSearch()]

export class Search {
  private query: SearchQuery
  private songs: SongSearchData[]
  private mode: SearchMode

  constructor(query: string, songs: SongSearchData[]) {
    this.query = new SearchQuery(query)
    this.songs = songs

    this.mode = this.resolveSearchMode()
  }

  public execute() {
    return this.mode.search(this.query, this.songs)
  }

  private resolveSearchMode() {
    return SearchModes.find((mode) => mode.matches(this.query)) ?? new DefaultSearch()
  }
}
