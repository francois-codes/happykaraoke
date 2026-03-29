import { KEYS } from '@/lib/consts'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'

export function useSongKeyboardShortcuts({
  scroller,
  reload,
  flushMasterScrollSnapshot
}: {
  scroller: ReturnType<typeof useAutoScroller>
  reload: () => void
  /** After scroll-master-only actions (space, speed, top), push snapshot so followers see running:false etc. */
  flushMasterScrollSnapshot?: () => void
}) {
  const {
    isAdmin,
    scrollMaster,
    searchOpen,
    transpoOpen,
    chordsEnabled,
    aiSearchOpen,
    aiPreviewOpen,
    openAIKeyModalOpen
  } = useStore()
  const dispatch = useDispatch()

  // cmd + ctrl + r => reload song
  useKeyboardShortcut(
    {
      key: [KEYS.r],
      modifier: [KEYS.Meta, KEYS.Ctrl],
      preventDefault: true,
      handler: () => {
        reload()
      }
    },
    [reload]
  )

  // t => open transpo (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.t],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: () => {
        dispatch({ transpoOpen: true })
      }
    },
    [isAdmin, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // space => start/stop scrolling (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.Space],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: () => {
        if (scrollMaster !== true) return
        scroller.toggleScrolling()
        flushMasterScrollSnapshot?.()
      }
    },
    [
      scroller,
      flushMasterScrollSnapshot,
      isAdmin,
      scrollMaster,
      searchOpen,
      aiSearchOpen,
      aiPreviewOpen,
      openAIKeyModalOpen
    ]
  )

  // right => increase scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.right,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        if (scrollMaster !== true) return
        scroller.increaseScrollSpeed()
        flushMasterScrollSnapshot?.()
      }
    },
    [
      scroller,
      flushMasterScrollSnapshot,
      isAdmin,
      scrollMaster,
      searchOpen,
      aiSearchOpen,
      aiPreviewOpen,
      openAIKeyModalOpen
    ]
  )

  // left => decrease scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.left,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        if (scrollMaster !== true) return
        scroller.decreaseScrollSpeed()
        flushMasterScrollSnapshot?.()
      }
    },
    [
      scroller,
      flushMasterScrollSnapshot,
      isAdmin,
      scrollMaster,
      searchOpen,
      aiSearchOpen,
      aiPreviewOpen,
      openAIKeyModalOpen
    ]
  )

  // $ => scroll to top (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.dollarSign,
      disable: () => {
        return !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: (event) => {
        event.preventDefault()
        if (scrollMaster !== true) return
        scroller.stopScrolling()
        scroller.scrollToTop()
        flushMasterScrollSnapshot?.()
      }
    },
    [
      scroller,
      flushMasterScrollSnapshot,
      isAdmin,
      scrollMaster,
      searchOpen,
      transpoOpen,
      aiSearchOpen,
      aiPreviewOpen,
      openAIKeyModalOpen
    ]
  )

  // c => toggle chords
  useKeyboardShortcut(
    {
      key: [KEYS.a],
      disable: () => searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        dispatch({ chordsEnabled: !chordsEnabled })
      }
    },
    [searchOpen, transpoOpen, chordsEnabled, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )
}
