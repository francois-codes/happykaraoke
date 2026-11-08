import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import type { CoverState } from '@shared/types/cover'

/** Folder, inside the songs folder, holding the cover images. */
export const COVER_IMAGES_DIR = 'images'
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif)$/i

/** Image files of `<songs folder>/images`, sorted like the Finder (case-insensitive, natural numbers). */
export function listCoverImages(songsFolder: string): string[] {
  try {
    return readdirSync(join(songsFolder, COVER_IMAGES_DIR))
      .filter((file) => !file.startsWith('.') && IMAGE_EXTENSIONS.test(file))
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }))
  } catch {
    return []
  }
}

/** Cover state for the n-th image (1-based), or null when there is no such image. */
export function resolveCover(songsFolder: string, index: number): CoverState | null {
  const file = listCoverImages(songsFolder)[index - 1]
  if (!file) return null
  try {
    return { index, file, version: Math.round(statSync(join(songsFolder, COVER_IMAGES_DIR, file)).mtimeMs) }
  } catch {
    return null
  }
}

/** Absolute path of the n-th image, or null. */
export function coverImagePath(songsFolder: string, index: number): string | null {
  const file = listCoverImages(songsFolder)[index - 1]
  return file ? join(songsFolder, COVER_IMAGES_DIR, file) : null
}
