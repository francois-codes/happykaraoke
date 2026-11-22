import type { LiveCandidate, LogLine, Soiree, SoireeKind, SoireePatch, SoireeSummary } from '@shared/lib/data/soireeFormat'
import { createEndpoint } from '@shared/types/endpoints'

interface AdminBody {
  userId: number
}

interface ErrorBody {
  message: string
}

type JsonResponse<T> = { status: (code: number) => { json: (body: T | ErrorBody) => unknown } }

/** Runs `action` only for an admin of the open session, with the current songs folder. */
async function asAdmin<T>(userId: number, res: JsonResponse<T>, action: (songsFolder: string) => Promise<T> | T): Promise<void> {
  const { requireAdminInOpenSession, getSessionConfig } = await import('@shared/lib/session')
  const auth = await requireAdminInOpenSession(Number(userId))
  if (!auth.ok) {
    res.status(auth.status).json({ message: auth.message })
    return
  }
  try {
    res.status(200).json(await action(getSessionConfig().songsFolder))
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : String(e) })
  }
}

async function emitChanged(startedAt: string | null): Promise<void> {
  const { soireeChanged } = await import('@shared/messages/soiree')
  soireeChanged.server.emit({ startedAt })
}

export const fetchCurrentSoiree = createEndpoint<unknown, { startedAt: string | null }>({
  method: 'get',
  url: '/soirees/current',
  handler: async (_, res) => {
    const { getCurrentSoiree } = await import('@shared/lib/data/soirees')
    const { getSessionConfig } = await import('@shared/lib/session')
    res.status(200).json({ startedAt: getCurrentSoiree(getSessionConfig().songsFolder) })
  }
})

export const startSoireeEndpoint = createEndpoint<AdminBody, { startedAt: string } | ErrorBody>({
  method: 'post',
  url: '/soirees/start',
  handler: async (req, res) => {
    const { startSoiree } = await import('@shared/lib/data/soirees')
    await asAdmin(req.body.userId, res, async (folder) => {
      const startedAt = startSoiree(folder)
      await emitChanged(startedAt)
      return { startedAt }
    })
  }
})

interface NewLiveBody {
  title: string
  notes: string
  kind: SoireeKind
}

export const stopSoireeEndpoint = createEndpoint<AdminBody & NewLiveBody, { soiree: Soiree | null } | ErrorBody>({
  method: 'post',
  url: '/soirees/stop',
  handler: async (req, res) => {
    const { stopSoiree } = await import('@shared/lib/data/soirees')
    const { userId, title, notes, kind } = req.body
    await asAdmin(userId, res, async (folder) => {
      const soiree = await stopSoiree(folder, { title: String(title ?? ''), notes: String(notes ?? ''), kind })
      await emitChanged(null)
      return { soiree }
    })
  }
})

export const cancelSoireeEndpoint = createEndpoint<AdminBody, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/soirees/cancel',
  handler: async (req, res) => {
    const { cancelSoiree } = await import('@shared/lib/data/soirees')
    await asAdmin(req.body.userId, res, async (folder) => {
      cancelSoiree(folder)
      await emitChanged(null)
      return { ok: true as const }
    })
  }
})

export const fetchSoirees = createEndpoint<unknown, SoireeSummary[]>({
  method: 'get',
  url: '/soirees',
  handler: async (_, res) => {
    const { listSoirees } = await import('@shared/lib/data/soirees')
    const { getSessionConfig } = await import('@shared/lib/session')
    res.status(200).json(listSoirees(getSessionConfig().songsFolder))
  }
})

export const fetchSoiree = createEndpoint<{ id: string }, Soiree | ErrorBody>({
  method: 'get',
  url: '/soirees/one',
  handler: async (req, res) => {
    const { getSoiree } = await import('@shared/lib/data/soirees')
    const { getSessionConfig } = await import('@shared/lib/session')
    try {
      res.status(200).json(getSoiree(getSessionConfig().songsFolder, String(req.query.id)))
    } catch (e) {
      res.status(404).json({ message: e instanceof Error ? e.message : String(e) })
    }
  }
})

export const updateSoireeEndpoint = createEndpoint<AdminBody & { id: string; patch: SoireePatch }, Soiree | ErrorBody>({
  method: 'post',
  url: '/soirees/update',
  handler: async (req, res) => {
    const { updateSoiree } = await import('@shared/lib/data/soirees')
    const { userId, id, patch } = req.body
    await asAdmin(userId, res, (folder) => updateSoiree(folder, id, patch ?? {}))
  }
})

/** Groups of the song log that look like lives and still need to be qualified. */
export const fetchLiveCandidates = createEndpoint<unknown, LiveCandidate[]>({
  method: 'get',
  url: '/soirees/candidates',
  handler: async (_, res) => {
    const { listCandidates } = await import('@shared/lib/data/soirees')
    const { getSessionConfig } = await import('@shared/lib/session')
    try {
      res.status(200).json(await listCandidates(getSessionConfig().songsFolder))
    } catch {
      res.status(200).json([])
    }
  }
})

export const ignoreLiveCandidate = createEndpoint<AdminBody & { from: string }, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/soirees/ignore',
  handler: async (req, res) => {
    const { ignoreCandidate } = await import('@shared/lib/data/soirees')
    const { userId, from } = req.body
    await asAdmin(userId, res, (folder) => {
      ignoreCandidate(folder, String(from))
      return { ok: true as const }
    })
  }
})

/** Saves a live found afterwards (a detected group, or first/last song picked by hand). */
export const createLiveFromLog = createEndpoint<AdminBody & NewLiveBody & { from: string; to: string }, Soiree | ErrorBody>({
  method: 'post',
  url: '/soirees/create',
  handler: async (req, res) => {
    const { createSoireeFromLog } = await import('@shared/lib/data/soirees')
    const { userId, from, to, title, notes, kind } = req.body
    await asAdmin(userId, res, (folder) =>
      createSoireeFromLog(folder, String(from), String(to), { title: String(title ?? ''), notes: String(notes ?? ''), kind })
    )
  }
})

export const deleteLive = createEndpoint<AdminBody & { id: string }, { ok: true } | ErrorBody>({
  method: 'post',
  url: '/soirees/delete',
  handler: async (req, res) => {
    const { deleteSoiree } = await import('@shared/lib/data/soirees')
    const { userId, id } = req.body
    await asAdmin(userId, res, (folder) => {
      deleteSoiree(folder, String(id))
      return { ok: true as const }
    })
  }
})

/** Songs launched on a day (06:00 → 06:00), to pick the first and last song of a live by hand. */
export const fetchDayLog = createEndpoint<{ day: string }, LogLine[] | ErrorBody>({
  method: 'get',
  url: '/soirees/day',
  handler: async (req, res) => {
    const { logsOfDay } = await import('@shared/lib/data/soirees')
    try {
      res.status(200).json(await logsOfDay(String(req.query.day)))
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : String(e) })
    }
  }
})
