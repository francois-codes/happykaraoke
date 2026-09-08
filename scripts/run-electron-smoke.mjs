import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
await build({
  entryPoints: ['src/server/main.ts', 'src/server/preload.ts'],
  outdir: 'out/server', bundle: true, platform: 'node', packages: 'external',
  tsconfig: 'tsconfig.node.json', define: { 'process.env.NODE_ENV': '"test"' }
})
const env = { ...process.env, KARAOKE_PROJECT_ROOT: process.cwd() }
delete env.ELECTRON_RUN_AS_NODE
const result = spawnSync(require('electron'), [resolve('tests/electron/smoke.cjs')], {
  stdio: 'inherit', env
})
process.exit(result.status ?? 1)
