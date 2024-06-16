import { watch } from 'fs'
import { getSessionConfig } from '../session'
import { songFileChanged } from '@shared/messages/song'

export function watchForChanges(signal: AbortSignal) {
  const folder = getSessionConfig().songsFolder

  watch(folder, { signal }, (eventType, filename) => {
    if (eventType === 'change' && filename?.endsWith('.txt')) {
      songFileChanged.server.emit({ filename })
    }
  })
}
