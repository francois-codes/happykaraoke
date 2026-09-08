export const SCROLL_JUMP_DURATION_MS = 170

export function createScrollAnimator(readTop: () => number, writeTop: (top: number) => void) {
  let frame: number | null = null
  const cancel = (): void => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }

  return {
    animateTo: (target: number, onDone?: () => void): void => {
      cancel()
      const start = readTop()
      if (start === target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        writeTop(target)
        onDone?.()
        return
      }
      const startedAt = performance.now()
      const step = (): void => {
        const progress = Math.min(1, (performance.now() - startedAt) / SCROLL_JUMP_DURATION_MS)
        writeTop(start + (target - start) * (1 - Math.pow(1 - progress, 3)))
        if (progress < 1) {
          frame = requestAnimationFrame(step)
        } else {
          frame = null
          onDone?.()
        }
      }
      frame = requestAnimationFrame(step)
    },
    cancel,
    isAnimating: (): boolean => frame !== null
  }
}
