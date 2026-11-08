/** Cover image shown over every guest screen (admins keep their view). */
export interface CoverState {
  /** 1, 2 or 3: position in the songs folder's `images/` directory (Finder-like alphabetical order). */
  index: number
  /** File name inside `images/`. */
  file: string
  /** File modification time (ms), used to bust the browser cache when the image is replaced. */
  version: number
}
