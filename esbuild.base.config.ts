import { BuildOptions } from 'esbuild'

export const sharedConfig = (env: 'production' | 'development'): BuildOptions => ({
  bundle: true,
  platform: 'node',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || env)
  },
  loader: {
    '.svg': 'dataurl'
  },
  external: [...Object.keys(require('./package.json').devDependencies), 'better-sqlite3'],
  tsconfig: 'tsconfig.node.json'
})

export const mainConfig = (env: 'production' | 'development'): BuildOptions => ({
  ...sharedConfig(env),
  entryPoints: ['src/server/main.ts'],
  outfile: 'out/server/main.js'
})

export const preloadConfig = (env: 'production' | 'development'): BuildOptions => ({
  ...sharedConfig(env),
  entryPoints: ['src/server/preload.ts'],
  outfile: 'out/server/preload.js'
})
