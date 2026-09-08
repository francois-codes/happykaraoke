import { config } from '@shared/config'
import { queue, session, sessionLog, user } from '@shared/db/schema'
import { differenceInMinutes, formatISO } from 'date-fns'
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import { UserType } from '@shared/types'
import type { ScrollSnapshot, ScrollSnapshotInput } from '@shared/types/scroll'
import { scrollControlState } from '@shared/messages/scroll'

import ip from 'ip'
export interface ScrollControlSnapshot {
  primaryAdminUserId: number | null
  activeScrollMasterUserId: number | null
}

export interface SessionConfig {
  currentSong?: string
  transpo: number
  songsFolder: string
  hostUrl: string
  scrollControl?: ScrollControlSnapshot | null
  scrollSnapshot?: ScrollSnapshot | null
}

export interface Session {
  id: number;
  sessionDate: string;
  closed: 0 | 1;
}

export interface SessionWithCount extends Session {
  songCount: number
}

const sessionConfig: SessionConfig = {
  transpo: 0,
  songsFolder: '',
  hostUrl: `http://${ip.address()}:${config.PORT}`
}

export const setSessionConfig = (config: Partial<SessionConfig>) => {
  Object.assign(sessionConfig, config)
}

export const getSessionConfig = () => {
  return sessionConfig
}

export async function startSessionIfNeeded() {
  const { db } = await import('@shared/db')

  const currentSession = await getCurrentSession()

  if (currentSession) {
    // Update any admin users from old sessions to point to current session
    await updateAdminUsersToCurrentSession(currentSession.id)
    return currentSession
  }

  const timestamp = formatISO(new Date())

  const [result] = await db.insert(session).values({ sessionDate: timestamp, closed: 0 }).returning({
    id: session.id,
    sessionDate: session.sessionDate,
    closed: session.closed
  })

  // Update any admin users from old sessions to point to this new session
  await updateAdminUsersToCurrentSession(result.id)

  return result
}

export async function getCurrentSession() {
  const { db } = await import('@shared/db')
  const { eq } = await import('drizzle-orm')

  const [result] = await db.select().from(session).where(eq(session.closed, 0)).limit(1)

  return result
}

export async function closeSession() {
  const { db } = await import('@shared/db')

  const result = await db
    .update(session)
    .set({ closed: 1 })
    .where(eq(session.closed, 0))
    .returning({ id: session.id })

  const closedSessionIds = result.map(({ id }) => id)

  // Delete guest users and queue items, but keep admin users
  await Promise.all([
    db.delete(user).where(
      and(
        inArray(user.sessionId, closedSessionIds),
        eq(user.type, UserType.GUEST)
      )
    ),
    db.delete(queue).where(inArray(queue.sessionId, closedSessionIds))
  ])

  return result
}

/**
 * Updates all admin users from closed sessions to point to the current open session
 * This ensures admin users persist across session refreshes
 */
async function updateAdminUsersToCurrentSession(currentSessionId: number) {
  const { db } = await import('@shared/db')

  // Get all closed session IDs
  const closedSessions = await db
    .select({ id: session.id })
    .from(session)
    .where(eq(session.closed, 1))

  if (closedSessions.length === 0) {
    return
  }

  const closedSessionIds = closedSessions.map(({ id }) => id)

  // Update admin users from closed sessions to point to current session
  await db
    .update(user)
    .set({ sessionId: currentSessionId })
    .where(
      and(
        inArray(user.sessionId, closedSessionIds),
        eq(user.type, UserType.ADMIN)
      )
    )
}

/**
 * Checks if the current session is still valid
 * Validates based on last activity (either last song log or session creation date)
 * If session is expired (last activity > TIMEOUT_MINUTES ago) or doesn't exist,
 * closes old session and creates a new one
 * Also migrates any admin users from closed sessions to the current session
 * @returns The current valid session
 */
export async function checkAndRefreshSession() {
  const { db } = await import('@shared/db')

  const currentSession = await getCurrentSession()

  // If no session exists, create one (will also migrate admin users)
  if (!currentSession) {
    return await startSessionIfNeeded()
  }

  // Check if session has timed out by looking at last song log
  const lastLog = await db
    .select()
    .from(sessionLog)
    .where(eq(sessionLog.sessionId, currentSession.id))
    .orderBy(desc(sessionLog.id))
    .limit(1)

  const lastLogEntry = lastLog?.[0]

  const now = new Date()
  let minutesSinceActivity: number

  // If no logs exist, check session creation date instead
  if (!lastLogEntry || !lastLogEntry.timestamp) {
    const sessionDate = new Date(currentSession.sessionDate)
    minutesSinceActivity = differenceInMinutes(now, sessionDate)
  } else {
    // Check last log timestamp
    const lastLogDate = new Date(lastLogEntry.timestamp)
    minutesSinceActivity = differenceInMinutes(now, lastLogDate)
  }

  // If session has timed out (either since last log or since creation), close it and create a new one
  if (minutesSinceActivity >= config.SESSION.TIMEOUT_MINUTES) {
    await closeSession()
    return await startSessionIfNeeded()
  }

  // Session is still valid, but still migrate any admin users from old sessions
  await updateAdminUsersToCurrentSession(currentSession.id)
  return currentSession
}

export async function addSessionLog(song: string) {
  const timestamp = formatISO(new Date())

  const { db } = await import('@shared/db')

  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('no current session!')
  }

  const previousSessionLog = await db
    .select()
    .from(sessionLog)
    .where(eq(sessionLog.sessionId, currentSession.id))
    .orderBy(desc(sessionLog.id))
    .limit(1)

  const lastLog = previousSessionLog?.[0]

  if (lastLog && lastLog.timestamp) {
    const lastLogDate = new Date(lastLog.timestamp)
    const diff = differenceInMinutes(new Date(timestamp), lastLogDate)

    // if last song was played less than MIN_LOG_GAP_MINUTES ago, delete it
    if (diff < config.SESSION.MIN_LOG_GAP_MINUTES) {
      await db.delete(sessionLog).where(eq(sessionLog.id, lastLog.id))
    }
  }

  // we insert a new song record

  const result = await db.insert(sessionLog).values({
    song,
    timestamp,
    sessionId: currentSession.id
  })

  return result
}

export async function getAllSessions(): Promise<SessionWithCount[]> {
  const { db } = await import('@shared/db')

  const result = await db
    .select({
      id: session.id,
      sessionDate: session.sessionDate,
      closed: session.closed,
      songCount: count(sessionLog.id)
    })
    .from(session)
    .where(eq(session.closed, 1))
    .innerJoin(sessionLog, eq(session.id, sessionLog.sessionId))
    .groupBy(session.id)
    .orderBy(desc(session.sessionDate), desc(session.id))

  return result
}

export async function getSessionLogsById(sessionId: number) {
  const { db } = await import('@shared/db')

  const result = await db.select().from(sessionLog).where(eq(sessionLog.sessionId, sessionId))

  return result
}

export async function getSessionLogs(date: string) {
  const { db } = await import('@shared/db')
  const { sql, asc, inArray } = await import('drizzle-orm')

  const sessionsOnDate = await db
    .select()
    .from(session)
    .where(sql`DATE(${session.sessionDate}) = ${date}`)

  if (!sessionsOnDate.length) {
    return []
  }

  const results = await db
    .select()
    .from(sessionLog)
    .where(
      inArray(
        sessionLog.sessionId,
        sessionsOnDate.map(({ id }) => id)
      )
    )
    .orderBy(asc(sessionLog.sessionId), asc(sessionLog.id))

  return results
}

export async function deleteSessionLog(sessionId: number) {
  const { db } = await import('@shared/db')

  const result = await Promise.all([
    db.delete(sessionLog).where(eq(sessionLog.sessionId, sessionId)),
    db.delete(session).where(eq(session.id, sessionId))
  ])

  return result
}

type ScrollControlRow = {
  activeScrollMasterUserId: number | null
  /** When true, do not auto-assign scroll master for a sole admin (user released explicitly). */
  soloExplicitRelease: boolean
}

type ScrollSnapshotRow = {
  seq: number
  snapshot: ScrollSnapshot | null
}

const scrollControlBySessionId = new Map<number, ScrollControlRow>()
const scrollSnapshotBySessionId = new Map<number, ScrollSnapshotRow>()

function getScrollControlRow(sessionId: number): ScrollControlRow {
  let row = scrollControlBySessionId.get(sessionId)
  if (!row) {
    row = {
      activeScrollMasterUserId: null,
      soloExplicitRelease: false
    }
    scrollControlBySessionId.set(sessionId, row)
  }
  return row
}

function getScrollSnapshotRow(sessionId: number): ScrollSnapshotRow {
  let row = scrollSnapshotBySessionId.get(sessionId)
  if (!row) {
    row = {
      seq: 0,
      snapshot: null
    }
    scrollSnapshotBySessionId.set(sessionId, row)
  }
  return row
}

export async function countAdminsForSession(sessionId: number): Promise<number> {
  const { db } = await import('@shared/db')

  const [r] = await db
    .select({ n: count(user.id) })
    .from(user)
    .where(and(eq(user.sessionId, sessionId), eq(user.type, UserType.ADMIN)))

  return Number(r?.n ?? 0)
}

/** Lowest admin id in the session (fallback when no scroll host is set). */
export async function getMinAdminUserIdForSession(sessionId: number): Promise<number | null> {
  const { db } = await import('@shared/db')

  const [first] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.sessionId, sessionId), eq(user.type, UserType.ADMIN)))
    .orderBy(asc(user.id))
    .limit(1)

  return first?.id ?? null
}

/**
 * Admin who may take/revoke scroll without a request: the host set on /login, else lowest admin id.
 */
export async function getScrollAuthorityUserId(sessionId: number): Promise<number | null> {
  const { db } = await import('@shared/db')

  const [sess] = await db
    .select({ host: session.scrollHostUserId })
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1)

  const hostId = sess?.host
  if (hostId != null) {
    const [hostAdmin] = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(eq(user.id, hostId), eq(user.sessionId, sessionId), eq(user.type, UserType.ADMIN))
      )
      .limit(1)

    if (hostAdmin) {
      return hostAdmin.id
    }
  }

  return getMinAdminUserIdForSession(sessionId)
}

/** First /login admin for this session becomes scroll host; join-route admins never call this. */
export async function setScrollHostUserIdIfUnset(sessionId: number, adminUserId: number) {
  const { db } = await import('@shared/db')

  const [row] = await db
    .select({ host: session.scrollHostUserId })
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1)

  if (row?.host != null) {
    return
  }

  await db
    .update(session)
    .set({ scrollHostUserId: adminUserId })
    .where(eq(session.id, sessionId))

  // A session refresh may have selected a migrated admin as the fallback already.
  // The creator becomes master when the host is first registered.
  const control = getScrollControlRow(sessionId)
  control.activeScrollMasterUserId = adminUserId
  control.soloExplicitRelease = false
  scrollControlState.server.emit({
    primaryAdminUserId: adminUserId,
    activeScrollMasterUserId: adminUserId
  })
}

export async function getScrollControlSnapshot(sessionId: number): Promise<ScrollControlSnapshot> {
  const authority = await getScrollAuthorityUserId(sessionId)
  const adminCount = await countAdminsForSession(sessionId)
  const row = getScrollControlRow(sessionId)

  if (
    !row.soloExplicitRelease &&
    row.activeScrollMasterUserId === null &&
    authority !== null &&
    adminCount >= 1
  ) {
    row.activeScrollMasterUserId = authority
  }

  return {
    primaryAdminUserId: authority,
    activeScrollMasterUserId: row.activeScrollMasterUserId
  }
}

type ScrollMutationError = { ok: false; status: number; message: string }
type ScrollMutationOk = { ok: true; snapshot: ScrollControlSnapshot }

type RequireSessionOk = { ok: true; sessionId: number }

async function requireAdminInOpenSession(
  callerUserId: number
): Promise<RequireSessionOk | ScrollMutationError> {
  const current = await getCurrentSession()
  if (!current) {
    return { ok: false, status: 400, message: 'No open session' }
  }

  const { getUser } = await import('@shared/lib/users')
  const u = await getUser(callerUserId)

  if (!u || u.type !== UserType.ADMIN || u.sessionId !== current.id) {
    return { ok: false, status: 403, message: 'Not an admin in this session' }
  }

  return { ok: true, sessionId: current.id }
}

export async function scrollControlTake(callerUserId: number): Promise<ScrollMutationOk | ScrollMutationError> {
  const auth = await requireAdminInOpenSession(callerUserId)
  if (!auth.ok) {
    return auth
  }

  const row = getScrollControlRow(auth.sessionId)
  row.activeScrollMasterUserId = callerUserId
  row.soloExplicitRelease = false

  return { ok: true, snapshot: await getScrollControlSnapshot(auth.sessionId) }
}

export async function scrollControlRelease(callerUserId: number): Promise<ScrollMutationOk | ScrollMutationError> {
  const auth = await requireAdminInOpenSession(callerUserId)
  if (!auth.ok) {
    return auth
  }

  const row = getScrollControlRow(auth.sessionId)
  if (row.activeScrollMasterUserId !== callerUserId) {
    return { ok: false, status: 403, message: 'Only the active scroll master can release' }
  }

  const authority = await getScrollAuthorityUserId(auth.sessionId)
  row.activeScrollMasterUserId = null
  row.soloExplicitRelease = callerUserId === authority

  return { ok: true, snapshot: await getScrollControlSnapshot(auth.sessionId) }
}

export async function getScrollSnapshot(sessionId: number): Promise<ScrollSnapshot | null> {
  const row = getScrollSnapshotRow(sessionId)
  return row.snapshot
}

type ScrollSnapshotMutationError = { ok: false; status: number; message: string }
type ScrollSnapshotMutationOk = { ok: true; snapshot: ScrollSnapshot }

export async function upsertScrollSnapshot(
  payload: ScrollSnapshotInput
): Promise<ScrollSnapshotMutationOk | ScrollSnapshotMutationError> {
  const auth = await requireAdminInOpenSession(payload.userId)
  if (!auth.ok) {
    return auth
  }

  const control = await getScrollControlSnapshot(auth.sessionId)
  if (control.activeScrollMasterUserId !== payload.userId) {
    return { ok: false, status: 403, message: 'Only active scroll master can publish snapshot' }
  }

  const row = getScrollSnapshotRow(auth.sessionId)
  row.seq += 1
  const snapshot: ScrollSnapshot = {
    masterUserId: payload.userId,
    songId: payload.songId,
    masterScrollTop: payload.masterScrollTop,
    anchorId: payload.anchorId,
    offsetPxFromAnchor: payload.offsetPxFromAnchor,
    autoScroll: payload.autoScroll,
    ...(payload.transition === 'section' ? { transition: 'section' as const } : {}),
    seq: row.seq,
    emittedAt: Date.now()
  }
  row.snapshot = snapshot

  return { ok: true, snapshot }
}
