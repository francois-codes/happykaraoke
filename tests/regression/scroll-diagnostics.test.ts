import { beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  readScrollDiagnosticsEnabled, readScrollDiagnosticsVerbose,
  scrollDiagnosticLog, setScrollDiagnosticsEnabled, setScrollDiagnosticsVerbose
} from '@shared/lib/scrollDiagnosticLog'
import { readDebugScrollAnchorsEnabled, resetScrollDebugSettings } from '../../src/client/lib/debugSettings'

const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value) },
  removeItem: (key: string) => { values.delete(key) }
}
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
beforeEach(() => {
  values.clear()
  scrollDiagnosticLog.clear()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } })
})
afterEach(() => {
  for (const [key, descriptor] of [['localStorage', originalStorage], ['window', originalWindow]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

test('scroll diagnostic logging defaults to off', () => {
  assert.equal(readScrollDiagnosticsEnabled(), false)
})

test('opening a session resets saved debug preferences and previous logs', () => {
  values.set('karaoke:debugScrollAnchors', '1')
  setScrollDiagnosticsEnabled(true)
  setScrollDiagnosticsVerbose(true)
  scrollDiagnosticLog.warn('previous session')
  resetScrollDebugSettings()
  assert.equal(readDebugScrollAnchorsEnabled(), false)
  assert.equal(readScrollDiagnosticsEnabled(), false)
  assert.equal(readScrollDiagnosticsVerbose(), false)
  assert.deepEqual(scrollDiagnosticLog.exportEntries(), [])
})

test('disabled diagnostics produce no entries or console output, and can be enabled manually', (context) => {
  const consoleLog = context.mock.method(console, 'log', () => {})
  setScrollDiagnosticsEnabled(false)
  scrollDiagnosticLog.info('hidden info')
  scrollDiagnosticLog.warn('hidden warning')
  scrollDiagnosticLog.error('hidden error')
  assert.equal(consoleLog.mock.callCount(), 0)
  assert.deepEqual(scrollDiagnosticLog.exportEntries(), [])
  setScrollDiagnosticsEnabled(true)
  scrollDiagnosticLog.warn('enabled warning')
  assert.equal(scrollDiagnosticLog.exportEntries().length, 1)
  assert.equal(consoleLog.mock.callCount(), 1)
})
