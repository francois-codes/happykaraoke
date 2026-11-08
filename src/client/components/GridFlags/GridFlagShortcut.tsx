import { KEYS } from '@/lib/consts'
import { getCurrentSectionLabel } from '@/lib/currentSectionLabel'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useStore } from '@/store'
import { flagSong, undoFlagSong } from '@shared/endpoints/gridFlags'
import type { AddGridFlagResult } from '@shared/lib/data/gridFlags'
import { type ReactElement, useEffect, useRef, useState } from 'react'

const UNDO_WINDOW_MS = 5000
const MESSAGE_MS = 2500

interface LastMark {
  title: string
  file: string
  markedAt: string
  at: number
}

/** Admin "P" key: flag the current song's grid as needing a fix (a second press within 5 s undoes it). */
export function GridFlagShortcut(): ReactElement | null {
  const { isAdmin, currentSong, searchOpen, transpoOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } = useStore()
  const [message, setMessage] = useState<string | null>(null)
  const lastMark = useRef<LastMark | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])

  function show(text: string): void {
    setMessage(text)
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), MESSAGE_MS)
  }

  async function toggleFlag(): Promise<void> {
    if (!currentSong) return
    const userId = Number(window.localStorage.getItem('userId'))
    const previous = lastMark.current
    try {
      if (previous && previous.title === currentSong && Date.now() - previous.at < UNDO_WINDOW_MS) {
        lastMark.current = null
        await undoFlagSong.call({ userId, file: previous.file, markedAt: previous.markedAt })
        show('Marque annulée')
        return
      }
      const section = getCurrentSectionLabel()
      const result = (await flagSong.call({ userId, title: currentSong, section })) as AddGridFlagResult
      lastMark.current = { title: currentSong, file: result.flag.file, markedAt: result.markedAt, at: Date.now() }
      show(`Grille marquée${section ? ` · ${section}` : ''} (P pour annuler)`)
    } catch {
      show('Impossible de marquer la grille')
    }
  }

  useKeyboardShortcut(
    {
      key: [KEYS.p],
      preventDefault: true,
      disable: () =>
        !isAdmin || !currentSong || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        void toggleFlag()
      }
    },
    [isAdmin, currentSong, searchOpen, transpoOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  if (!message) return null
  return (
    <div
      role="status"
      data-grid-flag-message
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-stone-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-stone-200 dark:text-stone-900"
    >
      {message}
    </div>
  )
}
