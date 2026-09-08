export type ScrollAnchorType = 'section' | 'break' | 'synthetic'

export interface ScrollAutoState {
  running: boolean
  speedPxPerSecond: number
}

export interface ScrollSnapshot {
  masterUserId: number
  songId: string
  /** Master's actual scroll container scrollTop (followers prefer this over anchor math when layouts differ). */
  masterScrollTop: number
  anchorId: string
  offsetPxFromAnchor: number
  autoScroll: ScrollAutoState
  /** Explicit section navigation; ordinary position corrections remain immediate. */
  transition?: 'section'
  seq: number
  emittedAt: number
}

export interface ScrollSnapshotInput {
  userId: number
  songId: string
  masterScrollTop: number
  anchorId: string
  offsetPxFromAnchor: number
  autoScroll: ScrollAutoState
  transition?: 'section'
}
