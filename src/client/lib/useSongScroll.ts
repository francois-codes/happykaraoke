import { useScrollContext } from '@/contexts/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setScrollSnapshot } from '@shared/endpoints/scroll'
import { scrollSnapshotChanged } from '@shared/messages/scroll'
import { scrollDiagnosticLog } from '@shared/lib/scrollDiagnosticLog'
import type { ScrollSnapshot } from '@shared/types/scroll'
import { useCallback, useEffect, useRef } from 'react'
import { setScrollDebugLogicalAnchorIndex } from './scrollLogicalAnchorDebugSync'
import { createScrollAnimator } from './scrollAnimation'
import { useSongSections } from './useSongSections'

/** Throttle when host is not auto-scrolling (manual wheel / sections). */
const MASTER_EMIT_MIN_MS_MANUAL = 45
/** Tighter while host RAF runs so followers can correct often and stay smooth. */
const MASTER_EMIT_MIN_MS_AUTOSCROLL = 22
const MUSICIAN_TRIGGER_VH = 0.55

export function useSongScroll(scroller: ReturnType<typeof useAutoScroller>) {
  const {
    scrollMaster,
    currentSong,
    musicienScroll,
    scrollSnapshot,
    searchOpen,
    aiSearchOpen,
    aiPreviewOpen,
    openAIKeyModalOpen
  } = useStore()
  const scrollContainerRef = useScrollContext()
  const scrollerRef = useRef(scroller)
  scrollerRef.current = scroller
  const musicianScrollRef = useRef(musicienScroll)
  musicianScrollRef.current = musicienScroll
  const animatorRef = useRef<ReturnType<typeof createScrollAnimator> | null>(null)
  if (animatorRef.current === null) {
    animatorRef.current = createScrollAnimator(
      () => scrollContainerRef.current?.scrollTop ?? 0,
      (top) => scrollerRef.current.scrollTo(top, 'instant')
    )
  }
  const animator = animatorRef.current
  const {
    resolveAnchors,
    getAnchorAtScrollTop,
    getScrollTopFromAnchor,
    getAnchorById
  } = useSongSections()

  const lastEmitRef = useRef(0)
  const lastPublishedAnchorIdRef = useRef<string | null>(null)
  const lastAppliedSeqRef = useRef(0)
  const sectionJumpDeltaRef = useRef(0)
  const sectionJumpQueueRafRef = useRef<number | null>(null)
  const pendingFollowerSnapshotRef = useRef<ScrollSnapshot | null>(null)
  const sectionJumpPendingRef = useRef(false)
  /** True while section jump animation runs — blocks emitSnapshot spam and stale scroll-based anchor reads. */
  const jumpAnimatingRef = useRef(false)
  /** Authoritative anchor index for arrow navigation (scrollTop can be sub-pixel / mid-tween). */
  const logicalAnchorIndexRef = useRef(0)
  const targetLineRef = useRef<HTMLDivElement | null>(null)
  /** Latest scroll host `masterScrollTop` for musician overlay (followers only). */
  const musicianMasterScrollTopRef = useRef<number | null>(null)
  const updateMusicianMasterLineLayoutRef = useRef<() => void>(() => {})
  const scrollMasterRef = useRef(false)
  scrollMasterRef.current = scrollMaster === true

  const emitSnapshot = useCallback((jump?: { top: number; anchorIndex: number; running: boolean }) => {
    if (jumpAnimatingRef.current && !jump) return
    if (!scrollMaster || !currentSong) return
    const raw = window.localStorage.getItem('userId')
    const myId = raw ? Number(raw) : NaN
    if (!Number.isFinite(myId)) return

    const container = scrollContainerRef.current
    if (!container) return

    const anchors = resolveAnchors()
    const top = jump?.top ?? container.scrollTop
    let anchor = anchors[jump?.anchorIndex ?? logicalAnchorIndexRef.current]
    if (
      !anchor ||
      logicalAnchorIndexRef.current < 0 ||
      logicalAnchorIndexRef.current >= anchors.length ||
      Math.abs(top - anchor.scrollTop) > 1
    ) {
      anchor = getAnchorAtScrollTop(top)
      const idx = anchors.findIndex((a) => a.id === anchor.id)
      if (idx >= 0) {
        logicalAnchorIndexRef.current = idx
      }
    }

    setScrollDebugLogicalAnchorIndex(logicalAnchorIndexRef.current)

    const now = performance.now()
    const bypassThrottle = anchor.id !== lastPublishedAnchorIdRef.current
    const minEmitMs = scroller.isRunning() ? MASTER_EMIT_MIN_MS_AUTOSCROLL : MASTER_EMIT_MIN_MS_MANUAL
    if (!jump && !bypassThrottle && now - lastEmitRef.current < minEmitMs) return
    lastEmitRef.current = now
    lastPublishedAnchorIdRef.current = anchor.id

    const offsetPxFromAnchor = Math.max(0, top - anchor.scrollTop)
    void setScrollSnapshot.call({
      userId: myId,
      songId: currentSong,
      masterScrollTop: top,
      anchorId: anchor.id,
      offsetPxFromAnchor,
      autoScroll: {
        running: jump?.running ?? scroller.isRunning(),
        speedPxPerSecond: scroller.getSpeed()
      },
      ...(jump ? { transition: 'section' as const } : {})
    }).catch((e: unknown) => {
      scrollDiagnosticLog.error('setScrollSnapshot failed', {
        category: 'scroll',
        message: e instanceof Error ? e.message : String(e)
      })
    })
  }, [currentSong, getAnchorAtScrollTop, resolveAnchors, scrollContainerRef, scrollMaster, scroller])

  const animateJumpToAnchor = useCallback(
    (targetTop: number, targetIndex: number, onDone?: () => void) => {
      const container = scrollContainerRef.current
      if (!container) return
      jumpAnimatingRef.current = true
      const wasRunning = scroller.isRunning()
      // Publish the destination before moving so followers start their transition immediately.
      emitSnapshot({ top: Math.round(targetTop), anchorIndex: targetIndex, running: wasRunning })
      if (wasRunning) {
        scroller.stopScrolling()
      }
      animator.animateTo(Math.round(targetTop), () => {
        logicalAnchorIndexRef.current = targetIndex
        jumpAnimatingRef.current = false
        if (wasRunning) {
          scroller.startScrolling()
        }
        onDone?.()
      })
    },
    [animator, emitSnapshot, scrollContainerRef, scroller]
  )

  const flushJumpQueue = useCallback(() => {
    sectionJumpQueueRafRef.current = null
    if (jumpAnimatingRef.current) {
      return
    }
    sectionJumpPendingRef.current = false
    if (!scrollMaster) return
    const container = scrollContainerRef.current
    if (!container) return
    const delta = sectionJumpDeltaRef.current
    if (delta === 0) return
    sectionJumpDeltaRef.current = 0
    const anchors = resolveAnchors()
    if (anchors.length === 0) return

    let targetIndex = Math.max(
      0,
      Math.min(anchors.length - 1, logicalAnchorIndexRef.current)
    )

    // Move through all anchors but skip same-scrollTop plateaus so each key press is visually effective.
    let remaining = Math.abs(delta)
    const direction = delta > 0 ? 1 : -1
    while (remaining > 0) {
      const current = anchors[targetIndex]
      if (!current) break
      let candidate = targetIndex + direction
      while (candidate >= 0 && candidate < anchors.length) {
        if (Math.abs(anchors[candidate].scrollTop - current.scrollTop) > 1) {
          break
        }
        candidate += direction
      }
      if (candidate < 0 || candidate >= anchors.length) {
        targetIndex = Math.max(0, Math.min(anchors.length - 1, direction > 0 ? anchors.length - 1 : 0))
        break
      }
      targetIndex = candidate
      remaining -= 1
    }

    const target = anchors[targetIndex]
    if (!target) return
    animateJumpToAnchor(target.scrollTop, targetIndex, () => {
      lastEmitRef.current = 0
      emitSnapshot()
      if (sectionJumpDeltaRef.current !== 0) {
        sectionJumpPendingRef.current = true
        sectionJumpQueueRafRef.current = requestAnimationFrame(flushJumpQueue)
      }
    })
  }, [animateJumpToAnchor, emitSnapshot, resolveAnchors, scrollContainerRef, scrollMaster])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!scrollMaster) return
      if (searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        sectionJumpDeltaRef.current += 1
        if (!sectionJumpPendingRef.current) {
          sectionJumpPendingRef.current = true
          sectionJumpQueueRafRef.current = requestAnimationFrame(flushJumpQueue)
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        sectionJumpDeltaRef.current -= 1
        if (!sectionJumpPendingRef.current) {
          sectionJumpPendingRef.current = true
          sectionJumpQueueRafRef.current = requestAnimationFrame(flushJumpQueue)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    aiPreviewOpen,
    aiSearchOpen,
    flushJumpQueue,
    openAIKeyModalOpen,
    scrollMaster,
    searchOpen
  ])

  const applyFollowerSnapshot = useCallback((snapshot: ScrollSnapshot) => {
    // Ignore only our own snapshot while we are scroll master (broadcast echo). Do not use
    // `scrollMaster` alone: when another admin takes master, the snapshot may arrive before
    // React flips `scrollMaster` to false — we must still apply their snapshot.
    const rawId = window.localStorage.getItem('userId')
    const myId = rawId ? Number(rawId) : NaN
    if (
      scrollMaster === true &&
      Number.isFinite(myId) &&
      snapshot.masterUserId === myId
    ) {
      return
    }
    if (!currentSong || snapshot.songId !== currentSong) return
    if (snapshot.seq <= Math.max(lastAppliedSeqRef.current, pendingFollowerSnapshotRef.current?.seq ?? 0)) return
    if (scrollMaster === true && snapshot.masterUserId !== myId) {
      animator.cancel()
      jumpAnimatingRef.current = false
      sectionJumpDeltaRef.current = 0
      sectionJumpPendingRef.current = false
    }
    // Frequent auto-scroll updates must not restart an in-flight transition every frame.
    if (animator.isAnimating() && snapshot.transition !== 'section') {
      pendingFollowerSnapshotRef.current = snapshot
      return
    }
    lastAppliedSeqRef.current = snapshot.seq

    const container = scrollContainerRef.current
    if (!container) return

    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
    const fromAnchor =
      getAnchorById(snapshot.anchorId) != null
        ? getScrollTopFromAnchor(snapshot.anchorId, snapshot.offsetPxFromAnchor)
        : null
    const fromMaster =
      typeof snapshot.masterScrollTop === 'number' && Number.isFinite(snapshot.masterScrollTop)
        ? snapshot.masterScrollTop
        : null
    const targetTop = Math.max(0, Math.min(fromAnchor ?? fromMaster ?? 0, maxScroll))

    if (snapshot.transition === 'section') {
      animator.cancel()
      pendingFollowerSnapshotRef.current = null
    }

    const animateFollowerTo = (top: number): void => {
      pendingFollowerSnapshotRef.current = null
      scroller.stopScrolling()
      animator.animateTo(top, () => {
        const pending = pendingFollowerSnapshotRef.current
        pendingFollowerSnapshotRef.current = null
        if (pending) {
          applyFollowerSnapshotRef.current(pending)
        } else if (snapshot.autoScroll.running && !musicianScrollRef.current) {
          scrollerRef.current.startScrolling()
        }
      })
    }

    if (musicienScroll) {
      musicianMasterScrollTopRef.current = fromMaster ?? targetTop
      queueMicrotask(() => {
        updateMusicianMasterLineLayoutRef.current()
      })
      scroller.stopScrolling()
      const currentTop = container.scrollTop
      const threshold = window.innerHeight * MUSICIAN_TRIGGER_VH
      if (targetTop < currentTop - 1) {
        animateFollowerTo(targetTop)
        return
      }
      if (targetTop - currentTop >= threshold) {
        const stepAnchor = getAnchorAtScrollTop(targetTop)
        animateFollowerTo(stepAnchor.scrollTop)
      }
      return
    }

    scroller.setSpeed(snapshot.autoScroll.speedPxPerSecond)

    if (snapshot.transition === 'section') {
      animateFollowerTo(targetTop)
      return
    }

    if (!snapshot.autoScroll.running) {
      scroller.stopScrolling()
      scroller.scrollTo(targetTop, 'instant')
      return
    }

    // Smooth follow: integrate at host speed; each snapshot re-aligns via anchor+offset (layout-aware).
    scroller.scrollTo(targetTop, 'instant')
    if (!scroller.isRunning()) {
      scroller.startScrolling()
    }
  }, [
    animator,
    currentSong,
    getAnchorAtScrollTop,
    getAnchorById,
    getScrollTopFromAnchor,
    musicienScroll,
    scrollContainerRef,
    scrollMaster,
    scroller
  ])

  scrollSnapshotChanged.client.useMessage(socket, applyFollowerSnapshot, [
    applyFollowerSnapshot
  ])

  const applyFollowerSnapshotRef = useRef(applyFollowerSnapshot)
  applyFollowerSnapshotRef.current = applyFollowerSnapshot
  const emitSnapshotRef = useRef(emitSnapshot)
  emitSnapshotRef.current = emitSnapshot
  const scrollMasterForStoreSyncRef = useRef(scrollMaster)
  scrollMasterForStoreSyncRef.current = scrollMaster

  // Only re-apply when `scrollSnapshot` in the store changes (e.g. session init). Do not
  // depend on `scrollMaster` or `applyFollowerSnapshot` identity — demoting scroll master
  // would re-run with stale init snapshot and overwrite live socket state.
  useEffect(() => {
    if (!scrollSnapshot) return
    if (scrollMasterForStoreSyncRef.current) return
    // Joining/reconnecting restores state directly; a stored jump is not a new navigation event.
    applyFollowerSnapshotRef.current({ ...scrollSnapshot, transition: undefined })
  }, [scrollSnapshot])

  useEffect(() => {
    if (!scrollMaster) return
    const container = scrollContainerRef.current
    if (!container) return
    let frameId: number | null = null
    const onScroll = () => {
      if (frameId !== null) return
      frameId = requestAnimationFrame(() => {
        frameId = null
        emitSnapshot()
      })
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [emitSnapshot, scrollContainerRef, scrollMaster])

  useEffect(() => {
    if (!currentSong) return
    logicalAnchorIndexRef.current = 0
    lastPublishedAnchorIdRef.current = null
    setScrollDebugLogicalAnchorIndex(0)
    if (scrollMasterRef.current) {
      scrollerRef.current.scrollToTop()
      emitSnapshotRef.current()
    }
  }, [currentSong])

  useEffect(() => {
    if (!scrollMaster) return
    emitSnapshotRef.current()
  }, [scrollMaster])

  useEffect(() => {
    if (!musicienScroll) {
      musicianMasterScrollTopRef.current = null
      updateMusicianMasterLineLayoutRef.current = () => {}
      return
    }

    if (
      !scrollMaster &&
      scrollSnapshot &&
      scrollSnapshot.songId === currentSong &&
      Number.isFinite(scrollSnapshot.masterScrollTop)
    ) {
      musicianMasterScrollTopRef.current = scrollSnapshot.masterScrollTop
    }

    const thresholdLine = document.createElement('div')
    thresholdLine.setAttribute('aria-hidden', 'true')
    thresholdLine.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      top: ${Math.round(window.innerHeight * MUSICIAN_TRIGGER_VH)}px;
      height: 1px;
      border-top: 1px dashed rgb(239 68 68);
      pointer-events: none;
      z-index: 40;
    `

    const masterLine = document.createElement('div')
    masterLine.setAttribute('aria-hidden', 'true')
    masterLine.title = 'Scroll host — top of their viewport'
    masterLine.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      height: 1px;
      border-top: 1px dashed rgb(56 189 248);
      pointer-events: none;
      z-index: 41;
      opacity: 0;
      transition: opacity 0.12s ease-out;
    `

    document.body.appendChild(thresholdLine)
    document.body.appendChild(masterLine)
    targetLineRef.current = thresholdLine

    let attached: HTMLElement | null = null
    let bindRaf: number | null = null
    let bindAttempts = 0

    const updateMasterLine = () => {
      if (scrollMasterRef.current) {
        masterLine.style.opacity = '0'
        return
      }
      const top = musicianMasterScrollTopRef.current
      if (top == null || !Number.isFinite(top)) {
        masterLine.style.opacity = '0'
        return
      }
      const el =
        scrollContainerRef.current ??
        (document.getElementById('scroll-container') as HTMLElement | null)
      if (!el) {
        masterLine.style.opacity = '0'
        return
      }
      const sm = el.scrollTop
      const rect = el.getBoundingClientRect()
      const y = rect.top + (top - sm)
      masterLine.style.top = `${Math.round(y)}px`
      const visible = y >= -8 && y <= window.innerHeight + 8
      masterLine.style.opacity = visible ? '1' : '0'
    }

    updateMusicianMasterLineLayoutRef.current = updateMasterLine

    const scheduleUpdate = () => {
      requestAnimationFrame(updateMasterLine)
    }

    const bindScroll = () => {
      const el =
        scrollContainerRef.current ??
        (document.getElementById('scroll-container') as HTMLElement | null)
      if (el instanceof HTMLElement) {
        if (attached !== el) {
          if (attached) {
            attached.removeEventListener('scroll', scheduleUpdate)
          }
          el.addEventListener('scroll', scheduleUpdate, { passive: true })
          attached = el
        }
        scheduleUpdate()
        return
      }
      bindAttempts += 1
      if (bindAttempts < 90) {
        bindRaf = requestAnimationFrame(bindScroll)
      }
    }

    bindScroll()
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()

    return () => {
      updateMusicianMasterLineLayoutRef.current = () => {}
      if (bindRaf != null) {
        cancelAnimationFrame(bindRaf)
      }
      window.removeEventListener('resize', scheduleUpdate)
      if (attached) {
        attached.removeEventListener('scroll', scheduleUpdate)
      }
      thresholdLine.remove()
      masterLine.remove()
      targetLineRef.current = null
    }
  }, [musicienScroll, scrollSnapshot, scrollMaster, currentSong, scrollContainerRef])

  useEffect(() => {
    return () => {
      animator.cancel()
      if (sectionJumpQueueRafRef.current !== null) {
        cancelAnimationFrame(sectionJumpQueueRafRef.current)
        sectionJumpQueueRafRef.current = null
      }
      jumpAnimatingRef.current = false
      pendingFollowerSnapshotRef.current = null
      sectionJumpDeltaRef.current = 0
      sectionJumpPendingRef.current = false
    }
  }, [animator, currentSong, scrollMaster])

  // Trigger anchor cache refresh side-effects.
  useEffect(() => {
    resolveAnchors()
    const topAnchor = getAnchorById(getAnchorAtScrollTop(0).id)
    if (topAnchor) {
      scrollDiagnosticLog.info('scroll anchors resolved', {
        category: 'scroll',
        count: resolveAnchors().length
      })
    }
  }, [currentSong, getAnchorAtScrollTop, getAnchorById, resolveAnchors])

  const flushMasterScrollSnapshot = useCallback(() => {
    if (!scrollMaster) return
    lastEmitRef.current = 0
    emitSnapshot()
  }, [emitSnapshot, scrollMaster])

  return { flushMasterScrollSnapshot }
}
