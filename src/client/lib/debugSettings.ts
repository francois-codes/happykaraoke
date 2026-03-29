const DEBUG_SCROLL_ANCHORS_KEY = 'karaoke:debugScrollAnchors'

export function readDebugScrollAnchorsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEBUG_SCROLL_ANCHORS_KEY) === '1'
  } catch {
    return false
  }
}

export function setDebugScrollAnchorsEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(DEBUG_SCROLL_ANCHORS_KEY, '1')
    } else {
      window.localStorage.removeItem(DEBUG_SCROLL_ANCHORS_KEY)
    }
  } catch {
    // private mode / quota
  }
}
