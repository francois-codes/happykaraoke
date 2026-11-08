import type { AddGridFlagResult, GridFlag } from '@shared/lib/data/gridFlags'
import { createEndpoint } from '@shared/types/endpoints'

interface AdminBody {
  userId: number
}

interface ErrorBody {
  message: string
}

/** Runs `action` only for an admin of the open session, with the current songs folder. */
async function asAdmin<T>(
  userId: number,
  res: { status: (code: number) => { json: (body: T | ErrorBody) => unknown } },
  action: (folder: string) => T
): Promise<void> {
  const { requireAdminInOpenSession, getSessionConfig } = await import('@shared/lib/session')
  const auth = await requireAdminInOpenSession(Number(userId))
  if (!auth.ok) {
    res.status(auth.status).json({ message: auth.message })
    return
  }
  try {
    res.status(200).json(action(getSessionConfig().songsFolder))
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : String(e) })
  }
}

export const flagSong = createEndpoint<AdminBody & { title: string; section: string | null }, AddGridFlagResult | ErrorBody>({
  method: 'post',
  url: '/grid-flags/flag',
  handler: async (req, res) => {
    const { addGridFlag } = await import('@shared/lib/data/gridFlags')
    const { userId, title, section } = req.body
    await asAdmin(userId, res, (folder) => addGridFlag(folder, title, section))
  }
})

export const undoFlagSong = createEndpoint<AdminBody & { file: string; markedAt: string }, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/grid-flags/undo',
  handler: async (req, res) => {
    const { undoGridFlag } = await import('@shared/lib/data/gridFlags')
    const { userId, file, markedAt } = req.body
    await asAdmin(userId, res, (folder) => {
      undoGridFlag(folder, file, markedAt)
      return { ok: true as const }
    })
  }
})

export const unflagSong = createEndpoint<AdminBody & { file: string }, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/grid-flags/remove',
  handler: async (req, res) => {
    const { removeGridFlag } = await import('@shared/lib/data/gridFlags')
    const { userId, file } = req.body
    await asAdmin(userId, res, (folder) => {
      removeGridFlag(folder, file)
      return { ok: true as const }
    })
  }
})

export const setGridFlagNoteEndpoint = createEndpoint<AdminBody & { file: string; note: string }, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/grid-flags/note',
  handler: async (req, res) => {
    const { setGridFlagNote } = await import('@shared/lib/data/gridFlags')
    const { userId, file, note } = req.body
    await asAdmin(userId, res, (folder) => {
      setGridFlagNote(folder, file, note)
      return { ok: true as const }
    })
  }
})

/** Current flags, after dropping those whose grid was edited since. */
export const fetchGridFlags = createEndpoint<unknown, GridFlag[]>({
  method: 'get',
  url: '/grid-flags',
  handler: async (_, res) => {
    const { pruneGridFlags } = await import('@shared/lib/data/gridFlags')
    const { getSessionConfig } = await import('@shared/lib/session')
    try {
      res.status(200).json(pruneGridFlags(getSessionConfig().songsFolder))
    } catch {
      res.status(200).json([])
    }
  }
})
