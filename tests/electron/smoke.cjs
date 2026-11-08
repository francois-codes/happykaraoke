const { app, BrowserWindow } = require('electron')
const { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
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
for (const [id, date, songs] of [[1, '2026-01-01T12:00:00Z', 6], [2, '2026-02-01T12:00:00Z', 6], [3, '2026-03-01T12:00:00Z', 3]]) {
  db.prepare('INSERT INTO session (id, sessionDate, closed) VALUES (?, ?, 1)').run(id, date)
  for (let i = 0; i < songs; i++) {
    db.prepare('INSERT INTO session_log (song, timestamp, sessionId) VALUES (?, ?, ?)').run(`Song ${i}`, date, id)
  }
}
const sections = Array.from({ length: 12 }, (_, i) =>
  `# Section ${i + 1}\n` + Array.from({ length: 12 }, (_, j) => `C       G       Am\nSing this line ${j + 1} in section ${i + 1}`).join('\n')
).join('\n\n')
writeFileSync(join(fixture, 'songs/Smoke Song.txt'), `Smoke Song\nTest Artist\nC\ntest\n\n${sections}`)
writeFileSync(join(fixture, 'songs/Second Song.txt'), `Second Song\nTest Artist\nC\ntest\n\n${sections.replaceAll('Section', 'Verse')}`)
const stanza = (n) => Array.from({ length: 3 }, (_, j) => `C       G       Am\nColour line ${j + 1} of block ${n}`).join('\n')
writeFileSync(join(fixture, 'songs/Colour Song.txt'), `Colour Song\nTest Artist\nC\ntest\n\n` + [
  `# Intro\n| C | G | Am | F |`,
  `# Couplet 1\n${stanza(1)}\n\n${stanza(2)}`,
  `# Pre-Chorus\n${stanza(3)}`,
  `[Refrain]\n${stanza(4)}`,
  `# Mystery part\n${stanza(5)}`,
  `# Pont\n${stanza(6)}`,
  `# Solo\n| C | G | Am | F |`,
  `# Outro\n${stanza(7)}`
].join('\n\n'))
const realSong = join(root, 'songs-library/David Bowie - Space Oddity.txt')
if (existsSync(realSong)) copyFileSync(realSong, join(fixture, 'songs/David Bowie - Space Oddity.txt'))
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
  if (keyCode !== 'Escape') await evaluate(win, 'document.activeElement?.blur()')
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode })
  await delay(80)
  await settleDialogs(win)
}
async function settleDialogs(win) {
  await evaluate(win, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
  await evaluate(win, `Promise.all(document.getAnimations().filter(animation =>
    animation.effect?.getComputedTiming().endTime < 1000
  ).map(animation => animation.finished.catch(() => {})))`)
}
async function openSettings(win) {
  if (!await evaluate(win, `document.body.innerText.includes('Scroll musicien')`)) {
    await key(win, 's')
  }
  await waitFor(win, `document.body.innerText.includes('Scroll musicien')`)
}
async function clickText(win, text) {
  await settleDialogs(win)
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
  await evaluate(admin, `(() => {
    localStorage.setItem('karaoke:debugScrollAnchors', '1');
    localStorage.setItem('happikaraoke.scrollDiagnostics.enabled', 'true');
    localStorage.setItem('happikaraoke.scrollDiagnostics.verbose', 'true');
  })()`)
  await clickText(admin, 'Ouvrir une session')
  await waitFor(admin, `!!document.querySelector('input[name="password"]')`)
  await fill(admin, 'input[name="password"]', 'Ab=G#')
  await clickText(admin, 'Ouvrir une session')
  await waitFor(admin, `location.pathname === '/session' && !!document.querySelector('[cmdk-item]')`)
  await clickText(admin, 'Test Artist - Smoke Song')
  await clickText(admin, 'Lancer la chanson (⏎)')
  await waitFor(admin, `!!document.getElementById('scroll-container') && document.body.innerText.includes('Section 12')`)
  await openSettings(admin)
  await waitFor(admin, `!!document.getElementById('scroll-master')`)
  assert.equal(await evaluate(admin, `document.getElementById('scroll-master').getAttribute('aria-checked')`), 'true')
  console.log('PASS Electron session creation enables scroll master')
  const diagnosticSwitches = ['debug-scroll-anchors', 'scroll-diag-enabled', 'scroll-diag-verbose']
  for (const id of diagnosticSwitches) {
    assert.equal(await evaluate(admin, `document.getElementById(${JSON.stringify(id)}).getAttribute('aria-checked')`), 'false')
    await evaluate(admin, `document.getElementById(${JSON.stringify(id)}).click()`)
    await waitFor(admin, `document.getElementById(${JSON.stringify(id)}).getAttribute('aria-checked') === 'true'`)
  }
  admin.webContents.reload()
  await waitFor(admin, `!!document.getElementById('scroll-container') && document.body.innerText.includes('Section 12')`)
  await openSettings(admin)
  for (const id of diagnosticSwitches) {
    assert.equal(await evaluate(admin, `document.getElementById(${JSON.stringify(id)}).getAttribute('aria-checked')`), 'false')
  }
  console.log('PASS Electron diagnostics start off despite saved preferences, support opt-in, and reset on reopening')
  await key(admin, 'Escape')

  const follower = new BrowserWindow({ width: 820, height: 1120, show: true,
    webPreferences: { partition: 'smoke-follower', backgroundThrottling: false } })
  await follower.loadURL('http://localhost:18081/join')
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
  await openSettings(follower)
  await waitFor(follower, `document.body.innerText.includes('Scroll musicien')`)
  await evaluate(follower, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(follower, 'Escape')
  await assertAnimatedJump('Down', 'musician forward step')
  await assertAnimatedJump('Up', 'musician backward step')

  await openSettings(follower)
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

  await openSettings(admin)
  await waitFor(admin, `document.body.innerText.includes('Scroll musicien')`)
  const modeJump = recordScroll(admin, 650)
  await evaluate(admin, `(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    setTimeout(() => [...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click(), 50);
  })()`)
  const modeSamples = await modeJump
  assert.ok(Math.abs(modeSamples.at(-1) - await evaluate(follower, `document.getElementById('scroll-container').scrollTop`)) <= 2,
    'changing musician preference during a host transition keeps viewers aligned')
  await evaluate(admin, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(admin, 'Escape')
  console.log('PASS changing musician preference during a host transition')

  async function displaySong(title, lastSection) {
    await evaluate(admin, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))`)
    await waitFor(admin, `!!document.querySelector('[cmdk-item]')`)
    await clickText(admin, title.includes(' - ') ? title : `Test Artist - ${title}`)
    await clickText(admin, 'Lancer la chanson (⏎)')
    for (const win of [admin, follower]) {
      await waitFor(win, `document.getElementById('song-lines')?.innerText.includes(${JSON.stringify(lastSection)})`)
    }
  }
  async function assertEveryoneAtTop(description) {
    for (const win of [admin, follower]) {
      const samples = await recordScroll(win, 350)
      if (samples.some(top => top > 1)) {
        console.log('Song reset failure:', win === admin ? 'host' : 'follower', samples,
          await evaluate(win, `fetch('/fetch-session').then(response => response.json()).then(config => config.scrollSnapshot)`))
      }
      assert.ok(samples.every(top => top <= 1), `${description}: expected top, got ${samples.at(-1)}`)
    }
    console.log(`PASS ${description}`)
  }

  await openSettings(admin)
  await evaluate(admin, `document.getElementById('scroll-master').click()`)
  await waitFor(admin, `document.getElementById('scroll-master').getAttribute('aria-checked') === 'false'`)
  await key(admin, 'Escape')
  for (const win of [admin, follower]) {
    await evaluate(win, `document.getElementById('scroll-container').scrollTop = 900`)
    await waitFor(win, `document.getElementById('scroll-container').scrollTop >= 899`)
  }
  await displaySong('Second Song', 'Verse 12')
  await assertEveryoneAtTop('song change resets everyone with scroll master disabled')

  await openSettings(follower)
  await evaluate(follower, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(follower, 'Escape')
  for (const win of [admin, follower]) {
    await evaluate(win, `document.getElementById('scroll-container').scrollTop = 1100`)
  }
  await displaySong('Smoke Song', 'Section 12')
  await assertEveryoneAtTop('song change resets musician followers without a scroll master')

  await openSettings(follower)
  await evaluate(follower, `[...document.querySelectorAll('label')].find(el => el.textContent === 'Scroll musicien').parentElement.querySelector('button').click()`)
  await key(follower, 'Escape')
  await openSettings(admin)
  await evaluate(admin, `document.getElementById('scroll-master').click()`)
  await waitFor(admin, `document.getElementById('scroll-master').getAttribute('aria-checked') === 'true'`)
  await key(admin, 'Escape')
  await key(admin, 'Down')
  await delay(250)
  await key(admin, 'Space')
  await displaySong('Second Song', 'Verse 12')
  await assertEveryoneAtTop('song change stops auto-scroll and resets host and follower')

  await key(admin, 'Down')
  await delay(300)
  const beforeReload = await evaluate(follower, `document.getElementById('scroll-container').scrollTop`)
  assert.ok(beforeReload > 100)
  follower.webContents.reload()
  await waitFor(follower, `document.getElementById('song-lines')?.innerText.includes('Verse 12')`)
  await waitFor(follower, `Math.abs(document.getElementById('scroll-container').scrollTop - ${beforeReload}) <= 2`)
  console.log('PASS reopening mid-song restores the master position')

  await openSettings(admin)
  await waitFor(admin, `document.body.innerText.includes('Logs de session')`)
  await clickText(admin, 'Logs de session')
  await waitFor(admin, `document.body.innerText.includes('Date: 2026-02-01')`)
  assert.deepEqual(await evaluate(admin, `[...document.querySelectorAll('p')].map(el => el.textContent).filter(text => text.startsWith('Date:'))`),
    ['Date: 2026-02-01', 'Date: 2026-01-01'], 'sessions with fewer than 5 songs are hidden')
  const trash = await evaluate(admin, `(() => {
    const button = document.querySelector('[aria-label="Supprimer les logs de cette session"]');
    const download = button.previousElementSibling;
    return { trash: getComputedStyle(button).backgroundColor, download: getComputedStyle(download).backgroundColor };
  })()`)
  const [r, g, b] = trash.trash.match(/\d+/g).map(Number)
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 12, `delete button is grey, got ${trash.trash}`)
  assert.notEqual(trash.trash, trash.download, 'delete button differs from download button')
  mkdirSync(join(root, 'out/electron-smoke'), { recursive: true })
  writeFileSync(join(root, 'out/electron-smoke/session-logs.png'), (await admin.webContents.capturePage()).toPNG())
  console.log('PASS Electron session history is newest first, hides short sessions, grey delete button')
  await key(admin, 'Escape')
  await key(admin, 'Escape')

  // "Grilles à corriger": P flags the current song (admin only), a second P within 5 s undoes,
  // and editing the grid file removes it from the list.
  const flagsPath = join(fixture, 'songs/.grilles-a-corriger.json')
  const readFlags = () => existsSync(flagsPath) ? JSON.parse(readFileSync(flagsPath, 'utf8')).flags : []
  await key(follower, 'p')
  await delay(300)
  assert.equal(readFlags().length, 0, 'a guest cannot flag a grid')
  await key(admin, 'Down')
  await delay(400)
  await key(admin, 'p')
  await waitFor(admin, `document.querySelector('[data-grid-flag-message]')?.textContent.startsWith('Grille marquée')`)
  let flags = readFlags()
  assert.equal(flags.length, 1)
  assert.equal(flags[0].file, 'Second Song.txt')
  assert.match(flags[0].sections[0].name, /^Verse \d+/, 'the section being played is recorded')
  assert.equal(await evaluate(admin, `fetch('/grid-flags').then(r => r.json()).then(list => list.length)`), 1)
  await key(admin, 'p')
  await waitFor(admin, `document.querySelector('[data-grid-flag-message]')?.textContent === 'Marque annulée'`)
  assert.equal(readFlags().length, 0, 'a second P within 5 s undoes the mark')
  await key(admin, 'p')
  await waitFor(admin, `document.querySelector('[data-grid-flag-message]')?.textContent.startsWith('Grille marquée')`)
  await openSettings(admin)
  await clickText(admin, 'Grilles à corriger')
  await waitFor(admin, `!!document.querySelector('[data-grid-flag="Second Song.txt"]')`)
  mkdirSync(join(root, 'out/electron-smoke'), { recursive: true })
  writeFileSync(join(root, 'out/electron-smoke/grid-flags.png'), (await admin.webContents.capturePage()).toPNG())
  await key(admin, 'Escape')
  await key(admin, 'Escape')
  const songPath = join(fixture, 'songs/Second Song.txt')
  writeFileSync(songPath, readFileSync(songPath, 'utf8') + '\n')
  await waitFor(admin, `fetch('/grid-flags').then(r => r.json()).then(list => list.length === 0)`)
  assert.equal(readFlags().length, 0, 'editing the grid removes the flag from the shared file')
  assert.ok(!(await evaluate(admin, `fetch('/songs').then(r => r.json()).then(d => d.songs.some(s => s.filename.startsWith('.grilles')))`)),
    'the shared flags file is not listed as a song')
  console.log('PASS grid flags: admin P marks with section, undo, guest refused, list, cleared on edit')

  mkdirSync(join(root, 'out/electron-smoke'), { recursive: true })
  await displaySong('Colour Song', 'Mystery part')
  const readBars = (win) => evaluate(win, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
    const scroller = document.getElementById('scroll-container').getBoundingClientRect();
    resolve([...document.querySelectorAll('.section-color-bar')].map(bar => {
      const box = bar.getBoundingClientRect();
      return { kind: bar.dataset.sectionKind, color: getComputedStyle(bar).backgroundColor,
        height: Math.round(box.height), visible: box.left >= scroller.left && box.width > 0 };
    }));
  })))`)
  const rowLayout = (win) => evaluate(win, `[...document.getElementById('song-lines').children]
    .filter(el => !el.querySelector('.section-color-bar') && !el.classList.contains('section-color-bar'))
    .map(el => { const r = el.getBoundingClientRect(); return [Math.round(r.top * 10), Math.round(r.left * 10), Math.round(r.width * 10), Math.round(r.height * 10)].join(',') })`)
  const expectedKinds = ['intro', 'verse', 'prechorus', 'chorus', 'bridge', 'solo', 'outro']
  for (const win of [admin, follower]) {
    const bars = await readBars(win)
    assert.deepEqual(bars.map(bar => bar.kind), expectedKinds, 'one bar per known section; unknown title gets none')
    assert.ok(bars.every(bar => bar.visible && bar.height > 0), 'bars are visible inside the scroll area')
    assert.equal(new Set(bars.filter(bar => bar.kind !== 'intro' && bar.kind !== 'outro').map(bar => bar.color)).size, 5,
      'each family has its own colour')
    const verse = bars.find(bar => bar.kind === 'verse')
    const prechorus = bars.find(bar => bar.kind === 'prechorus')
    assert.ok(verse.height > prechorus.height * 1.5, 'an untitled stanza continues the current section bar')
    assert.notEqual(await evaluate(win, `getComputedStyle(document.querySelector('.song-section[data-section-kind="chorus"] strong')).backgroundColor`),
      'rgba(0, 0, 0, 0)', 'section title is tinted in chords mode')
    const before = await rowLayout(win)
    await evaluate(win, `(() => { const style = document.createElement('style'); style.id = 'no-colours';
      style.textContent = '.section-color-bar{display:none!important} .song-section strong{background:none!important;box-shadow:none!important}';
      document.head.append(style) })()`)
    assert.deepEqual(await rowLayout(win), before, 'section colours do not move any line')
    await evaluate(win, `document.getElementById('no-colours').remove()`)
  }
  writeFileSync(join(root, 'out/electron-smoke/section-colours-admin.png'), (await admin.webContents.capturePage()).toPNG())
  writeFileSync(join(root, 'out/electron-smoke/section-colours-follower.png'), (await follower.webContents.capturePage()).toPNG())
  const chordsOnTop = await evaluate(admin, `document.getElementById('scroll-container').scrollTop`)
  await key(admin, 'a')
  await waitFor(admin, `document.getElementById('song-lines').classList.contains('song-lines--lyrics-only')`)
  assert.equal((await readBars(admin)).length, 0, 'no bars in lyrics-only mode')
  assert.equal(await evaluate(admin, `getComputedStyle(document.querySelector('.song-section[data-section-kind="chorus"] strong')).backgroundColor`),
    'rgba(0, 0, 0, 0)', 'no title tint in lyrics-only mode')
  assert.equal((await readBars(follower)).length, 7, 'chord display is per device: follower keeps its colours')
  writeFileSync(join(root, 'out/electron-smoke/section-colours-lyrics-only.png'), (await admin.webContents.capturePage()).toPNG())
  await key(admin, 'a')
  await waitFor(admin, `document.getElementById('song-lines').classList.contains('song-lines--chords-on')`)
  assert.ok(Math.abs(await evaluate(admin, `document.getElementById('scroll-container').scrollTop`) - chordsOnTop) <= 2)
  await key(admin, 'd')
  await waitFor(admin, `document.documentElement.classList.contains('dark')`)
  writeFileSync(join(root, 'out/electron-smoke/section-colours-dark.png'), (await admin.webContents.capturePage()).toPNG())
  await key(admin, 'd')
  if (existsSync(realSong)) {
    await displaySong('David Bowie - Space Oddity', 'Fmaj7')
    writeFileSync(join(root, 'out/electron-smoke/section-colours-space-oddity.png'), (await admin.webContents.capturePage()).toPNG())
  }
  console.log('PASS section colours: chords mode only, per family, no layout change, admin and follower')
  writeFileSync(join(root, 'out/electron-smoke/admin.png'), (await admin.webContents.capturePage()).toPNG())

  await key(admin, 'd')
  await waitFor(admin, `document.documentElement.classList.contains('dark')`)
  await key(admin, 'q')
  await waitFor(admin, `document.body.innerText.includes('Rejoindre la session') && !!document.querySelector('[role="dialog"] svg[height="256"]')`)
  writeFileSync(join(root, 'out/electron-smoke/qr-dark.png'), (await admin.webContents.capturePage()).toPNG())
  const quietZone = await evaluate(admin, `(() => {
    const svg = document.querySelector('[role="dialog"] svg[height="256"]');
    const style = getComputedStyle(svg.parentElement);
    return { background: style.backgroundColor, padding: parseFloat(style.paddingLeft),
      moduleSize: svg.getBoundingClientRect().width / svg.viewBox.baseVal.width,
      colors: [...svg.querySelectorAll('path')].map(path => path.getAttribute('fill')) };
  })()`)
  assert.equal(quietZone.background, 'rgb(255, 255, 255)')
  assert.ok(quietZone.padding >= quietZone.moduleSize * 4, 'white quiet zone spans at least four QR modules')
  assert.deepEqual(quietZone.colors.map(color => color.toLowerCase()).sort(), ['#000000', '#ffffff'])
  admin.setSize(380, 850)
  await delay(100)
  assert.ok(await evaluate(admin, `(() => {
    const box = document.querySelector('[role="dialog"] svg[height="256"]').parentElement.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth;
  })()`), 'QR fits a narrow Electron window')
  writeFileSync(join(root, 'out/electron-smoke/qr-dark-narrow.png'), (await admin.webContents.capturePage()).toPNG())
  await key(admin, 'Escape')
  await key(admin, 'd')
  await key(admin, 'q')
  await waitFor(admin, `!!document.querySelector('[role="dialog"] svg[height="256"]')`)
  assert.equal(await evaluate(admin, `getComputedStyle(document.querySelector('[role="dialog"] svg[height="256"]').parentElement).backgroundColor`), 'rgb(255, 255, 255)')
  await key(admin, 'Escape')
  admin.setSize(820, 1120)
  console.log('PASS Electron QR quiet zone in dark/light themes and a narrow window')

  const closingSession = db.prepare('SELECT id FROM session WHERE closed = 0').get()
  await openSettings(admin)
  await waitFor(admin, `document.body.innerText.includes('Terminer la session')`)
  await clickText(admin, 'Terminer la session')
  await waitFor(admin, `document.body.innerText.includes('Oui, fermer')`)
  await clickText(admin, 'Oui, fermer')
  await waitFor(admin, `location.pathname === '/'`)
  assert.equal(db.prepare('SELECT id FROM session WHERE id = ?').get(closingSession.id), undefined)
  assert.equal(db.prepare('SELECT count(*) AS n FROM session_log WHERE sessionId = ?').get(closingSession.id).n, 0)
  assert.equal(db.prepare('SELECT count(*) AS n FROM session WHERE closed = 1').get().n, 3)
  assert.equal(existsSync(join(fixture, 'electron-data/debug-logs')), false,
    'closing with diagnostics disabled does not export a debug file')
  console.log('PASS Electron close button deletes the short session and preserves older history')
  console.log('Electron smoke fixture:', fixture)
}

const timeout = setTimeout(() => { console.error('Electron smoke timed out'); app.exit(1) }, 150000)
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
