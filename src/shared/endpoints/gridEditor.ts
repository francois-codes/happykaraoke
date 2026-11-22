import { createEndpoint } from '@shared/types/endpoints'

interface ErrorBody {
  message: string
}

export interface ImportResult {
  /** File name of the grid in the songs folder (with `.txt`). */
  name: string
  /** True when a grid with this name already exists: nothing was written. */
  exists: boolean
}

/** Is the grid editor running on this Mac? (The "Ultimate Guitar" entry only shows when it is.) */
export const fetchGridEditorStatus = createEndpoint<unknown, { available: boolean }>({
  method: 'get',
  url: '/grid-editor/status',
  handler: async (_, res) => {
    const { config } = await import('@shared/config')
    try {
      const r = await fetch(`${config.GRID_EDITOR_URL}/api/liste`, { signal: AbortSignal.timeout(1000) })
      res.status(200).json({ available: r.ok })
    } catch {
      res.status(200).json({ available: false })
    }
  }
})

/** Creates a grid from an Ultimate Guitar link through the grid editor (it never replaces an existing grid). */
export const importUltimateGuitar = createEndpoint<{ userId: number; url: string }, ImportResult | ErrorBody>({
  method: 'post',
  url: '/grid-editor/import',
  handler: async (req, res) => {
    const { requireAdminInOpenSession } = await import('@shared/lib/session')
    const { config } = await import('@shared/config')
    const auth = await requireAdminInOpenSession(Number(req.body.userId))
    if (!auth.ok) {
      res.status(auth.status).json({ message: auth.message })
      return
    }
    const url = String(req.body.url ?? '').trim()
    if (!/^https:\/\/(tabs\.)?ultimate-guitar\.com\//.test(url)) {
      res.status(400).json({ message: 'Colle un lien de page d’accords Ultimate Guitar (https://tabs.ultimate-guitar.com/…).' })
      return
    }
    try {
      const r = await fetch(`${config.GRID_EDITOR_URL}/api/importer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30000)
      })
      const body: unknown = await r.json()
      const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
      if (r.status === 409 && typeof data.existe === 'string') {
        res.status(200).json({ name: data.existe, exists: true })
      } else if (r.ok && typeof data.name === 'string') {
        res.status(200).json({ name: data.name, exists: false })
      } else {
        res.status(400).json({ message: typeof data.erreur === 'string' ? data.erreur : 'Import impossible.' })
      }
    } catch {
      res.status(502).json({ message: 'L’éditeur de grilles ne répond pas : lance-le puis réessaie.' })
    }
  }
})
