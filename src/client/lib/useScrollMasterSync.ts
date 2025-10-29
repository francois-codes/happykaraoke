import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { scrollMasterEnabled } from '@shared/messages/scroll'

/**
 * Hook to sync scroll master state across all admin clients.
 * When one admin enables scroll master, it automatically disables it for other admins.
 */
export function useScrollMasterSync() {
  const { scrollMaster } = useStore()
  const dispatch = useDispatch()
  const userId = window.localStorage.getItem('userId')

  // Listen for scroll master enabled events from other admins
  scrollMasterEnabled.client.useMessage(socket, ({ userId: enabledUserId }) => {
    // If another admin enabled scroll master and we have it enabled, disable ours
    if (enabledUserId !== userId && scrollMaster) {
      dispatch({ scrollMaster: false })
    }
  }, [scrollMaster, userId])
}
