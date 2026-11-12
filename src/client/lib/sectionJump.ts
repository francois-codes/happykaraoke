/**
 * Jump to a section from outside the scroll hook (structure bar). Dispatched as a window event so the
 * jump goes through `useSongScroll`, exactly like the admin's ↑ / ↓ section navigation (same animation,
 * same snapshot broadcast to followers).
 */
export const SECTION_JUMP_EVENT = 'karaoke:section-jump'

export interface SectionJumpDetail {
  /** Index of the heading among all `.song-section` elements of the song (same index as `section:<n>` anchors). */
  headingIndex: number
}

export function requestSectionJump(headingIndex: number): void {
  window.dispatchEvent(new CustomEvent<SectionJumpDetail>(SECTION_JUMP_EVENT, { detail: { headingIndex } }))
}

/** Reads a jump request from an untyped event; null when malformed. */
export function readSectionJump(event: Event): SectionJumpDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail: unknown = event.detail
  if (typeof detail !== 'object' || detail === null) return null
  const headingIndex = (detail as { headingIndex?: unknown }).headingIndex
  return typeof headingIndex === 'number' && Number.isInteger(headingIndex) && headingIndex >= 0 ? { headingIndex } : null
}
