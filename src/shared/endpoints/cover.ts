import type { CoverState } from '@shared/types/cover'
import { createEndpoint } from '@shared/types/endpoints'

interface SetCoverBody {
  userId: number
  /** 1, 2 or 3 to show that image to guests, null to remove the cover. */
  index: number | null
}

/** Admin only: show (or remove) a cover image on every guest screen. */
export const setCover = createEndpoint<SetCoverBody, { cover: CoverState | null } | { message: string }>({
  method: 'post',
  url: '/cover',
  handler: async (req, res) => {
    const { requireAdminInOpenSession, getSessionConfig, setSessionConfig } = await import('@shared/lib/session')
    const { resolveCover } = await import('@shared/lib/data/coverImages')
    const { coverChanged } = await import('@shared/messages/cover')
    const { userId, index } = req.body
    const auth = await requireAdminInOpenSession(Number(userId))
    if (!auth.ok) {
      res.status(auth.status).json({ message: auth.message })
      return
    }
    let cover: CoverState | null = null
    if (index !== null) {
      cover = resolveCover(getSessionConfig().songsFolder, Number(index))
      if (!cover) {
        res.status(404).json({ message: `Pas d'image n°${index} dans le dossier images` })
        return
      }
    }
    setSessionConfig({ cover })
    coverChanged.server.emit({ cover })
    res.status(200).json({ cover })
  }
})

/** Serves the n-th cover image (`?index=1`), read from `<songs folder>/images`. */
export const getCoverImage = createEndpoint<{ index: string }, unknown>({
  method: 'get',
  url: '/cover-image',
  cache: true,
  handler: async (req, res) => {
    const { getSessionConfig } = await import('@shared/lib/session')
    const { coverImagePath } = await import('@shared/lib/data/coverImages')
    const path = coverImagePath(getSessionConfig().songsFolder, Number(req.query.index))
    if (!path) {
      res.sendStatus(404)
      return
    }
    res.sendFile(path)
  }
})
