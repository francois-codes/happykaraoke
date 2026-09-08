import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { sqlite } from '../support/database'
import {
  getAllSessions, getCurrentSession, getScrollControlSnapshot, scrollControlRelease,
  startSessionIfNeeded, closeSession, getScrollSnapshot, upsertScrollSnapshot,
  checkAndRefreshSession
} from '@shared/lib/session'
import { loginUser } from '@shared/endpoints/user'
import { config } from '@shared/config'
import { socketEmitter } from '@shared/server/socketEmitter'

let baselineId = 0
beforeEach(() => {
  sqlite.exec('DELETE FROM queue; DELETE FROM session_log; DELETE FROM user; DELETE FROM session;')
  baselineId += 100
  sqlite.prepare('INSERT INTO session (id, sessionDate, closed) VALUES (?, ?, 1)')
    .run(baselineId, '2026-01-01T12:00:00Z')
})

async function login() {
  const app = express()
  app.use(express.json())
  loginUser.register(app)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: config.ADMIN_PASSWORD })
    })
    assert.equal(response.status, 200)
    return (await response.json()) as { user: { id: number } }
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

test('the creator takes default scroll ownership from a migrated fallback admin', async () => {
  sqlite.prepare('INSERT INTO user (id, name, type, sessionId) VALUES (1, ?, ?, ?)')
    .run('Previous admin', 'admin', baselineId)
  const session = await startSessionIfNeeded()
  assert.equal((await getScrollControlSnapshot(session.id)).activeScrollMasterUserId, 1)
  const broadcasts: unknown[] = []
  const listener = ({ event, payload }: { event: string; payload: unknown }) => {
    if (event === 'scroll:control:state') broadcasts.push(payload)
  }
  socketEmitter.on('socket:emit', listener)
  try {
    const { user } = await login()
    const expected = { primaryAdminUserId: user.id, activeScrollMasterUserId: user.id }
    assert.deepEqual(await getScrollControlSnapshot(session.id), expected)
    assert.deepEqual(broadcasts, [expected], 'connected fallback admins receive the new ownership')
  } finally {
    socketEmitter.off('socket:emit', listener)
  }
})

test('another login does not steal ownership or undo the creator’s explicit release', async () => {
  const { user } = await login()
  const session = await getCurrentSession()
  assert.ok(session)
  assert.equal((await getScrollControlSnapshot(session.id)).activeScrollMasterUserId, user.id)
  await login()
  assert.equal((await getScrollControlSnapshot(session.id)).activeScrollMasterUserId, user.id)
  assert.equal((await scrollControlRelease(user.id)).ok, true)
  await login()
  assert.equal((await getScrollControlSnapshot(session.id)).activeScrollMasterUserId, null)
})

test('session history lists newest dates first with newest IDs breaking ties', async () => {
  const dates = ['2026-03-01T12:00:00Z', '2026-01-01T12:00:00Z', '2026-03-01T12:00:00Z']
  for (const [index, date] of dates.entries()) {
    const id = baselineId + index + 1
    sqlite.prepare('INSERT INTO session (id, sessionDate, closed) VALUES (?, ?, 1)').run(id, date)
    sqlite.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, ?)')
      .run('A song', date, id)
  }
  assert.deepEqual((await getAllSessions()).map(({ id }) => id),
    [baselineId + 3, baselineId + 1, baselineId + 2])
})

for (const songCount of [0, 4, 5]) {
  test(`closing a session with ${songCount} logs cleans dependent data and applies the five-song threshold`, async () => {
    const { user } = await login()
    const session = await getCurrentSession()
    assert.ok(session)
    const guest = sqlite.prepare('INSERT INTO user (name, type, sessionId) VALUES (?, ?, ?)')
      .run('Guest', 'guest', session.id).lastInsertRowid
    sqlite.prepare('INSERT INTO queue (song, "order", userId, sessionId) VALUES (?, 1, ?, ?)')
      .run('Queued song', guest, session.id)
    for (let i = 0; i < songCount; i++) {
      sqlite.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, ?)')
        .run(`Song ${i}`, new Date().toISOString(), session.id)
    }
    await upsertScrollSnapshot({ userId: user.id, songId: 'Old song', masterScrollTop: 300,
      anchorId: 'section:1', offsetPxFromAnchor: 0,
      autoScroll: { running: false, speedPxPerSecond: 36 } })
    await scrollControlRelease(user.id)
    await closeSession()
    const persisted = sqlite.prepare('SELECT closed FROM session WHERE id = ?').get(session.id)
    assert.deepEqual(persisted, songCount < 5 ? undefined : { closed: 1 })
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM session_log WHERE sessionId = ?').get(session.id)?.n,
      songCount < 5 ? 0 : songCount)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM queue').get()?.n, 0)
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM user WHERE type = 'guest'").get()?.n, 0)
    assert.ok(sqlite.prepare('SELECT id FROM user WHERE id = ?').get(user.id), 'admin identity survives')
    assert.ok(sqlite.prepare('SELECT id FROM session WHERE id = ?').get(baselineId), 'old history is untouched')
    assert.deepEqual(await closeSession(), [], 'repeated close is a no-op')

    const next = await startSessionIfNeeded()
    assert.equal(sqlite.prepare('SELECT sessionId FROM user WHERE id = ?').get(user.id)?.sessionId, next.id)
    assert.equal(await getScrollSnapshot(next.id), null, 'new/reused session has no old scroll snapshot')
    assert.equal((await getScrollControlSnapshot(next.id)).activeScrollMasterUserId, user.id,
      'new/reused session does not inherit explicit release')
  })
}

test('timeout closure prunes a short session and keeps the admin in the replacement', async () => {
  const { user } = await login()
  const old = await getCurrentSession()
  assert.ok(old)
  sqlite.prepare('UPDATE session SET sessionDate = ? WHERE id = ?').run('2020-01-01T12:00:00Z', old.id)
  const next = await checkAndRefreshSession()
  assert.notEqual(next.sessionDate, '2020-01-01T12:00:00Z')
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM session WHERE closed = 1 AND id != ?').get(baselineId)?.n, 0)
  assert.equal(sqlite.prepare('SELECT sessionId FROM user WHERE id = ?').get(user.id)?.sessionId, next.id)
})

test('failed pruning rolls back closure and leaves its logs intact', async () => {
  await login()
  const session = await getCurrentSession()
  assert.ok(session)
  sqlite.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, ?)')
    .run('Song', new Date().toISOString(), session.id)
  sqlite.exec("CREATE TRIGGER prevent_session_delete BEFORE DELETE ON session BEGIN SELECT RAISE(ABORT, 'test deletion failure'); END;")
  try {
    await assert.rejects(closeSession(), /test deletion failure/)
    assert.equal((await getCurrentSession())?.id, session.id)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM session_log WHERE sessionId = ?').get(session.id)?.n, 1)
  } finally {
    sqlite.exec('DROP TRIGGER prevent_session_delete')
  }
})
