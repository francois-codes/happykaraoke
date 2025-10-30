import { songFileChanged } from '@shared/messages/song'
import { watch } from 'fs'
import { getSessionConfig } from '../session'

export function watchForChanges(signal: AbortSignal) {
  const folder = getSessionConfig().songsFolder

  watch(folder, { signal }, (eventType, filename) => {
    // 'change' = file modified, 'rename' = file created or deleted
    if ((eventType === 'change' || eventType === 'rename') && filename?.endsWith('.txt')) {
      songFileChanged.server.emit({ filename })
    }
  })
}
