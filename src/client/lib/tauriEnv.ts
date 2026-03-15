import { isTauri as isTauriRuntime } from '@tauri-apps/api/core'

/** True when running inside Tauri (desktop app with Rust backend). Uses runtime check so it works in the built app (asset protocol). */
export const isTauri = isTauriRuntime()

/** API base URL: 8081 when in Tauri (Rust backend), same origin otherwise. */
export const apiBaseUrl = isTauri ? 'http://127.0.0.1:8081' : ''
