import esbuild from 'esbuild'

esbuild
  .build({
    entryPoints: ['src/server/main.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'out/server/main.js',
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
