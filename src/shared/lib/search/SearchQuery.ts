import { sanitizeSearchString } from './utils'

const regex = /(\w+):\s+(\w+)/g

export class SearchQuery {
  private query: string
  keywords: Record<string, string> = {}
  private _content?: string

  constructor(query: string) {
    this.query = query
    this.parse()
  }

  get content(): string {
    return this._content ?? ''
  }

  private parse() {
    let match

    while ((match = regex.exec(this.query))) {
      if (!match[2]) return
      this.keywords[match[1]] = sanitizeSearchString(`${match[2]}`)
    }

    this._content = sanitizeSearchString(this.query.replace(regex, ''))
  }
}
