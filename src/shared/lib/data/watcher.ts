import { songFileChanged } from '@shared/messages/song'
import { watch } from 'fs'
import { getSessionConfig } from '../session'
import { pruneGridFlags } from './gridFlags'

/** Drops "grilles à corriger" flags whose grid was edited (also catches edits made while the app was closed). */
function pruneFlagsSafely(folder: string): void {
  try {
    pruneGridFlags(folder)
  } catch (e) {
    console.error('Grid flags prune failed:', e)
  }
}

export function watchForChanges(signal: AbortSignal) {
  const folder = getSessionConfig().songsFolder
  pruneFlagsSafely(folder)

  watch(folder, { signal }, (eventType, filename) => {
    // 'change' = file modified, 'rename' = file created or deleted
    if ((eventType === 'change' || eventType === 'rename') && filename?.endsWith('.txt')) {
      songFileChanged.server.emit({ filename })
      pruneFlagsSafely(folder)
    }
  })
}
