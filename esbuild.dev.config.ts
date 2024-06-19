import esbuild, { BuildOptions } from 'esbuild'
import { spawn } from 'child_process'
import chokidar from 'chokidar'
import { mainConfig, preloadConfig } from './esbuild.base.config'

const isDev = process.env.NODE_ENV === 'development'

let electronProcess: null | ReturnType<typeof spawn> = null

const startElectron = () => {
  if (electronProcess) {
    electronProcess?.kill()
  }
  electronProcess = spawn('electron', ['out/server/main.js'], { stdio: 'inherit' })
}

async function buildConfig(config: BuildOptions) {
  try {
    const ctx = await esbuild.context(config)
    await ctx.watch()
  } catch (error) {
    console.error('Build failed:', error)
  }
}

async function build() {
  await buildConfig(preloadConfig('development'))
  await buildConfig(mainConfig('development'))
  startElectron()
}

if (isDev) {
  chokidar.watch('src/**/*.ts').on('change', async (filePath) => {
    console.log(`${filePath} has changed, rebuilding...`)
    build()
  })
}

build()
