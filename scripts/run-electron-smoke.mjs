import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
await build({
  entryPoints: ['src/server/main.ts', 'src/server/preload.ts'],
  outdir: 'out/server', bundle: true, platform: 'node', packages: 'external',
  tsconfig: 'tsconfig.node.json', define: { 'process.env.NODE_ENV': '"test"' },
  plugins: [{ name: 'isolated-smoke-port', setup(build) {
    build.onLoad({ filter: /shared\/config\/index\.ts$/ }, async ({ path }) => ({
      contents: `${await readFile(path, 'utf8')}\nconfig.PORT = 18081`, loader: 'ts'
    }))
  } }]
})
const env = { ...process.env, KARAOKE_PROJECT_ROOT: process.cwd() }
delete env.ELECTRON_RUN_AS_NODE
const result = spawnSync(require('electron'), [resolve('tests/electron/smoke.cjs')], {
  stdio: 'inherit', env
})
process.exit(result.status ?? 1)
