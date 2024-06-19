import esbuild from 'esbuild'
import { mainConfig, preloadConfig } from './esbuild.base.config'
const configs = [mainConfig, preloadConfig]

configs.forEach((config) => {
  esbuild.build(config('production')).catch(() => process.exit(1))
})
