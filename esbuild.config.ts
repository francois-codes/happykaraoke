import esbuild from 'esbuild'

esbuild
  .build({
    entryPoints: ['src/server/main.ts'],
    outfile: 'out/server/main.js',
    bundle: true,
    platform: 'node',

    define: {
      'process.env.NODE_ENV': "'production'"
    },
    loader: {
      '.svg': 'dataurl'
    },
    external: [...Object.keys(require('./package.json').devDependencies), 'better-sqlite3'],
    tsconfig: 'tsconfig.node.json'
  })
  .catch(() => process.exit(1))

esbuild
  .build({
    entryPoints: ['src/server/preload.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'out/server/preload.js',
    define: {
      'process.env.NODE_ENV': "'production'"
    },
    loader: {
      '.svg': 'dataurl'
    },
    external: Object.keys(require('./package.json').devDependencies),
    tsconfig: 'tsconfig.node.json'
  })
  .catch(() => process.exit(1))
