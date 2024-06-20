import esbuild, { BuildOptions } from 'esbuild'
import { spawn } from 'child_process'
import { mainConfig, preloadConfig } from './esbuild.base.config'

let electronProcess: null | ReturnType<typeof spawn> = null

const startElectron = () => {
  if (electronProcess) {
    electronProcess?.kill()
  }
  electronProcess = spawn('electron', ['out/server/main.js'], { stdio: 'inherit' })
}

async function buildConfig(config: BuildOptions) {
  try {
    const ctx = await esbuild.context({
      ...config,
      plugins: [
        ...(config.plugins ?? []),
        {
          name: 'watcher',
          setup: (build) => {
            build.onEnd(() => {
              startElectron()
            })
          }
        }
      ]
    })
    await ctx.watch()
  } catch (error) {
    console.error('Build failed:', error)
  }
}

async function build() {
  await buildConfig(preloadConfig('development'))
  await buildConfig(mainConfig('development'))
  // startElectron()
}

build()
