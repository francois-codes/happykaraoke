import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { scrollControlState } from '@shared/messages/scroll'

/**
 * Keeps scroll master and scroll delegation state in sync with the server for all admins.
 */
export function useScrollMasterSync() {
  const dispatch = useDispatch()
  const { isAdmin } = useStore()

  scrollControlState.client.useMessage(
    socket,
    (payload) => {
      const raw = window.localStorage.getItem('userId')
      const myId = raw ? Number(raw) : NaN
      dispatch({
        scrollControl: payload,
        scrollMaster: isAdmin === true && payload.activeScrollMasterUserId === myId
      })
    },
    [dispatch, isAdmin]
  )
}
