import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { sqlite } from '../support/database'
import {
  getAllSessions, getCurrentSession, getScrollControlSnapshot, scrollControlRelease,
  startSessionIfNeeded
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
