import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const output = resolve('node_modules/.cache/karaoke-tests')
await mkdir(output, { recursive: true })
const files = (await readdir('tests/regression')).filter((file) => file.endsWith('.test.ts'))
await build({
  entryPoints: files.map((file) => `tests/regression/${file}`),
  outdir: output,
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  packages: 'external',
  tsconfig: 'tsconfig.web.json',
  plugins: [{
    name: 'isolated-test-database',
    setup(builder) {
      builder.onResolve({ filter: /^@shared\/db$/ }, () => ({
        path: resolve('tests/support/database.ts')
      }))
    }
  }]
})
const result = spawnSync(require('electron'), [
  '--test', ...process.argv.slice(2), ...files.map((file) => resolve(output, file.replace('.ts', '.cjs')))
], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(result.status ?? 1)
