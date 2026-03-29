/** Lets section-scroll debug UI follow keyboard plateau navigation (same scrollTop, distinct anchors). */

let logicalIndex = 0
const listeners = new Set<() => void>()

export function setScrollDebugLogicalAnchorIndex(i: number) {
  if (logicalIndex === i) return
  logicalIndex = i
  for (const l of listeners) {
    l()
  }
}

export function getScrollDebugLogicalAnchorIndex(): number {
  return logicalIndex
}

export function subscribeScrollDebugLogicalAnchor(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
