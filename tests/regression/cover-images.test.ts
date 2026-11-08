import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverImagePath, listCoverImages, resolveCover } from '../../src/shared/lib/data/coverImages'

function songsFolder(files: string[]): string {
  const folder = mkdtempSync(join(tmpdir(), 'cover-images-'))
  mkdirSync(join(folder, 'images'))
  for (const file of files) writeFileSync(join(folder, 'images', file), 'x')
  return folder
}

test('cover images are listed in Finder order (case-insensitive, natural numbers), images only', () => {
  const folder = songsFolder(['vignette.jpg', 'Slide 16_9 - 1.jpg', 'aucun express.jpg', 'notes.txt', '.DS_Store', 'Image 10.PNG', 'Image 2.webp'])
  assert.deepEqual(listCoverImages(folder), ['aucun express.jpg', 'Image 2.webp', 'Image 10.PNG', 'Slide 16_9 - 1.jpg', 'vignette.jpg'])
})

test('shortcut index maps to the n-th image; missing image or folder gives nothing', () => {
  const folder = songsFolder(['vignette.jpg', 'Slide 16_9 - 1.jpg', 'aucun express.jpg'])
  assert.equal(resolveCover(folder, 1)?.file, 'aucun express.jpg')
  assert.equal(resolveCover(folder, 2)?.file, 'Slide 16_9 - 1.jpg')
  assert.equal(resolveCover(folder, 3)?.file, 'vignette.jpg')
  assert.ok((resolveCover(folder, 1)?.version ?? 0) > 0, 'version comes from the file date')
  assert.equal(coverImagePath(folder, 3), join(folder, 'images', 'vignette.jpg'))
  assert.equal(resolveCover(songsFolder(['seule.jpg']), 2), null)
  assert.deepEqual(listCoverImages(mkdtempSync(join(tmpdir(), 'no-images-'))), [])
})
