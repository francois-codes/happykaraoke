/** Per-device preference: show the structure bar on the right of the song (on by default). */
const STRUCTURE_BAR_KEY = 'karaoke:structureBar'

export function readStructureBarEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(STRUCTURE_BAR_KEY) !== '0'
  } catch {
    return true
  }
}

export function setStructureBarEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.removeItem(STRUCTURE_BAR_KEY)
    } else {
      window.localStorage.setItem(STRUCTURE_BAR_KEY, '0')
    }
  } catch {
    // private mode / quota
  }
}
