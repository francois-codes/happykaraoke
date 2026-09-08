const { app, BrowserWindow } = require('electron')
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const assert = require('node:assert/strict')
const Database = require('better-sqlite3')

// Run the real main process and React screens with a disposable database and songs.
const root = process.env.KARAOKE_PROJECT_ROOT
const fixture = mkdtempSync(join(tmpdir(), 'karaoke-electron-'))
mkdirSync(join(fixture, 'resources'))
mkdirSync(join(fixture, 'songs'))
app.setPath('userData', join(fixture, 'electron-data'))
const source = new Database(join(root, 'resources/db.sqlite'), { readonly: true })
const db = new Database(join(fixture, 'resources/db.sqlite'))
for (const { sql } of source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
  db.exec(sql)
}
source.close()
db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('song_folder', join(fixture, 'songs'))
for (const [id, date] of [[1, '2026-01-01T12:00:00Z'], [2, '2026-02-01T12:00:00Z']]) {
  db.prepare('INSERT INTO session (id, sessionDate, closed) VALUES (?, ?, 1)').run(id, date)
  for (let i = 0; i < 6; i++) {
    db.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, ?)').run(`Song ${i}`, date, id)
  }
}
const sections = Array.from({ length: 12 }, (_, i) =>
  `# Section ${i + 1}\n` + Array.from({ length: 12 }, (_, j) => `C       G       Am\nSing this line ${j + 1} in section ${i + 1}`).join('\n')
).join('\n\n')
writeFileSync(join(fixture, 'songs/Smoke Song.txt'), `Smoke Song\nTest Artist\nC\ntest\n\n${sections}`)
process.chdir(fixture)
require(join(root, 'out/server/main.js'))

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const evaluate = (win, code) => win.webContents.executeJavaScript(code, true)
async function waitFor(win, expression, timeout = 15000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (await evaluate(win, expression)) return
    await delay(75)
  }
  throw new Error(`Timed out: ${expression}; screen: ${await evaluate(win, 'document.body.innerText.slice(0, 1500)')}`)
}
async function key(win, keyCode) {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode })
  await delay(80)
}
async function clickText(win, text) {
  await evaluate(win, `(() => {
    const el = [...document.querySelectorAll('button,a,[cmdk-item]')].find(el => el.textContent.trim() === ${JSON.stringify(text)});
    if (!el) throw new Error('Missing control: ' + ${JSON.stringify(text)});
    el.click();
  })()`)
}
async function fill(win, selector, value) {
  await evaluate(win, `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
}
async function recordScroll(win, duration = 650) {
  return evaluate(win, `new Promise(resolve => {
    const values = []; const start = performance.now();
    function sample() {
      values.push(document.getElementById('scroll-container').scrollTop);
      if (performance.now() - start < ${duration}) requestAnimationFrame(sample);
      else resolve(values);
    }
    sample();
  })`)
}

async function run() {
  await app.whenReady()
  while (!BrowserWindow.getAllWindows().length) await delay(20)
  const admin = BrowserWindow.getAllWindows()[0]
  admin.webContents.setBackgroundThrottling(false)
  admin.webContents.on('console-message', (_, level, message) => {
    if (level >= 3) console.error('Renderer:', message)
  })
  await waitFor(admin, `!!document.querySelector('a[href="/new"]')`)
  await clickText(admin, 'Ouvrir une session')
  await waitFor(admin, `!!document.querySelector('input[name="password"]')`)
  await fill(admin, 'input[name="password"]', 'Ab=G#')
  await clickText(admin, 'Ouvrir une session')
  await waitFor(admin, `location.pathname === '/session' && !!document.querySelector('[cmdk-item]')`)
  await clickText(admin, 'Test Artist - Smoke Song')
  await clickText(admin, 'Lancer la chanson (⏎)')
  await waitFor(admin, `!!document.getElementById('scroll-container') && document.body.innerText.includes('Section 12')`)
  await key(admin, 's')
  await waitFor(admin, `!!document.getElementById('scroll-master')`)
  assert.equal(await evaluate(admin, `document.getElementById('scroll-master').getAttribute('aria-checked')`), 'true')
  console.log('PASS Electron session creation enables scroll master')
  await key(admin, 'Escape')

  const follower = new BrowserWindow({ width: 820, height: 1120, show: true,
    webPreferences: { partition: 'smoke-follower', backgroundThrottling: false } })
  await follower.loadURL('http://localhost:8081/join')
  await waitFor(follower, `!!document.querySelector('input[name="userName"]')`)
  await fill(follower, 'input[name="userName"]', 'iPad musician')
  await clickText(follower, 'Rejoindre la session')
  await waitFor(follower, `!!document.getElementById('scroll-container') && document.body.innerText.includes('Section 12')`)
  const a = recordScroll(admin)
  const f = recordScroll(follower)
  await key(admin, 'Down')
  const [hostSamples, followerSamples] = await Promise.all([a, f])
  console.log('Section animation:', JSON.stringify({
    hostPositions: new Set(hostSamples.map(Math.round)).size,
    followerPositions: new Set(followerSamples.map(Math.round)).size,
    hostFinal: hostSamples.at(-1), followerFinal: followerSamples.at(-1)
  }))
  assert.ok(new Set(hostSamples.map(Math.round)).size > 3, 'host animates through intermediate positions')
  assert.ok(new Set(followerSamples.map(Math.round)).size > 3, 'follower animates through intermediate positions')
  assert.ok(Math.abs(hostSamples.at(-1) - followerSamples.at(-1)) <= 2, 'matching windows finish aligned')
  console.log('PASS Electron host and follower section transitions')

  const top = await evaluate(admin, `document.getElementById('scroll-container').scrollTop`)
  await key(admin, 'a')
  await key(admin, 'a')
  assert.ok(Math.abs(await evaluate(admin, `document.getElementById('scroll-container').scrollTop`) - top) <= 2,
    'chord toggles do not reset scrolling')

  async function assertAnimatedJump(direction, description) {
    const recording = recordScroll(follower)
    await key(admin, direction)
    const samples = await recording
    assert.ok(new Set(samples.map(Math.round)).size > 3, `${description} has intermediate frames`)
    console.log(`PASS ${description}`)
    return samples
  }
  await assertAnimatedJump('Up', 'reverse section transition')
  await key(follower, 's')
  await waitFor(follower, `document.body.innerText.includes('Scroll musicien')`)
  await evaluate(follower, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(follower, 'Escape')
  await assertAnimatedJump('Down', 'musician forward step')
  await assertAnimatedJump('Up', 'musician backward step')

  await key(follower, 's')
  await waitFor(follower, `document.body.innerText.includes('Scroll musicien')`)
  await evaluate(follower, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(follower, 'Escape')
  const rapid = recordScroll(admin, 900)
  await key(admin, 'Down')
  await key(admin, 'Down')
  await key(admin, 'Down')
  const rapidSamples = await rapid
  assert.ok(rapidSamples.at(-1) > top * 2, 'rapid presses reach later sections')
  assert.ok(Math.abs(rapidSamples.at(-1) - await evaluate(follower, `document.getElementById('scroll-container').scrollTop`)) <= 2)
  console.log('PASS rapid navigation and chord toggle stability')

  await key(admin, 'Space')
  const auto = recordScroll(admin, 800)
  await key(admin, 'Down')
  const autoSamples = await auto
  assert.ok(autoSamples.at(-1) > autoSamples.at(-10), 'auto-scroll resumes after transition')
  assert.ok(autoSamples.every((value, i) => i === 0 || value >= autoSamples[i - 1] - 2),
    'auto-scroll never jumps back to its previous internal position')
  await key(admin, 'Space')
  console.log('PASS auto-scroll resumes without snapping backwards')

  await key(admin, 's')
  await waitFor(admin, `document.body.innerText.includes('Logs de session')`)
  await clickText(admin, 'Logs de session')
  await waitFor(admin, `document.body.innerText.includes('Date: 2026-02-01')`)
  assert.deepEqual(await evaluate(admin, `[...document.querySelectorAll('p')].map(el => el.textContent).filter(text => text.startsWith('Date:'))`),
    ['Date: 2026-02-01', 'Date: 2026-01-01'])
  console.log('PASS Electron session history is newest first')
  await key(admin, 'Escape')
  await key(admin, 'Escape')

  mkdirSync(join(root, 'out/electron-smoke'), { recursive: true })
  writeFileSync(join(root, 'out/electron-smoke/admin.png'), (await admin.webContents.capturePage()).toPNG())

  const closingSession = db.prepare('SELECT id FROM session WHERE closed = 0').get()
  await key(admin, 's')
  await waitFor(admin, `document.body.innerText.includes('Terminer la session')`)
  await clickText(admin, 'Terminer la session')
  await waitFor(admin, `document.body.innerText.includes('Oui, fermer')`)
  await clickText(admin, 'Oui, fermer')
  await waitFor(admin, `location.pathname === '/'`)
  assert.equal(db.prepare('SELECT id FROM session WHERE id = ?').get(closingSession.id), undefined)
  assert.equal(db.prepare('SELECT count(*) AS n FROM session_log WHERE sessionId = ?').get(closingSession.id).n, 0)
  assert.equal(db.prepare('SELECT count(*) AS n FROM session WHERE closed = 1').get().n, 2)
  console.log('PASS Electron close button deletes the short session and preserves older history')
  console.log('Electron smoke fixture:', fixture)
}

const timeout = setTimeout(() => { console.error('Electron smoke timed out'); app.exit(1) }, 60000)
run().then(() => {
  clearTimeout(timeout)
  db.close()
  app.exit(0)
}).catch((error) => {
  console.error(error)
  clearTimeout(timeout)
  db.close()
  app.exit(1)
})
