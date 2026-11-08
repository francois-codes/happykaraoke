import { KEYS } from '@/lib/consts'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setCover } from '@shared/endpoints/cover'
import { coverChanged } from '@shared/messages/cover'
import type { CoverState } from '@shared/types/cover'
import { AxiosError } from 'axios'
import { type ReactElement, useEffect, useRef, useState } from 'react'

/** ⌘Y / ⌘U / ⌘I → 1st / 2nd / 3rd image of the `images` folder. */
const COVER_KEYS: { key: KEY_VALUES; index: number; label: string }[] = [
  { key: KEYS.y, index: 1, label: '⌘Y' },
  { key: KEYS.u, index: 2, label: '⌘U' },
  { key: KEYS.i, index: 3, label: '⌘I' }
]
const ERROR_MS = 3000

/**
 * Cover images: guests see the image full screen; admins see a small banner and drive it
 * (same shortcut again or Escape removes it).
 */
export function CoverLayer(): ReactElement | null {
  const { isAdmin, cover, searchOpen, transpoOpen, qrCodeOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } = useStore()
  const dispatch = useDispatch()
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<number | null>(null)

  coverChanged.client.useMessage(socket, ({ cover: next }) => dispatch({ cover: next }), [dispatch])

  useEffect(() => () => {
    if (errorTimer.current != null) window.clearTimeout(errorTimer.current)
  }, [])

  async function requestCover(index: number | null): Promise<void> {
    try {
      const userId = Number(window.localStorage.getItem('userId'))
      const result = (await setCover.call({ userId, index })) as { cover: CoverState | null }
      dispatch({ cover: result.cover })
      setError(null)
    } catch (e) {
      const message = e instanceof AxiosError ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(message ?? "Impossible d'afficher l'image")
      if (errorTimer.current != null) window.clearTimeout(errorTimer.current)
      errorTimer.current = window.setTimeout(() => setError(null), ERROR_MS)
    }
  }

  /** Escape belongs to an open dialog first (the settings popover is not a dialog). */
  const dialogOpen = (): boolean =>
    searchOpen || transpoOpen || qrCodeOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen

  useKeyboardShortcut(
    {
      key: COVER_KEYS.map((c) => c.key),
      modifier: [KEYS.Meta],
      preventDefault: true,
      disable: () => !isAdmin,
      handler: (event) => {
        const entry = COVER_KEYS.find((c) => c.key === event.key.toLowerCase())
        if (!entry) return
        void requestCover(cover?.index === entry.index ? null : entry.index)
      }
    },
    [isAdmin, cover]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.Escape],
      disable: () => !isAdmin || !cover || dialogOpen(),
      handler: () => {
        void requestCover(null)
      }
    },
    [isAdmin, cover, searchOpen, transpoOpen, qrCodeOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  if (isAdmin) {
    const label = cover ? COVER_KEYS.find((c) => c.index === cover.index)?.label : null
    if (!cover && !error) return null
    return (
      <div
        role="status"
        data-cover-admin-banner
        className="pointer-events-none fixed top-20 left-4 z-50 max-w-[calc(100vw-2rem)] rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black shadow-lg"
      >
        {error ?? `Couverture ${cover?.index} affichée aux invités · ${label} ou Échap pour retirer`}
      </div>
    )
  }

  if (!cover) return null
  return (
    <div data-cover-overlay className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <img
        src={`/cover-image?index=${cover.index}&v=${cover.version}`}
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  )
}
