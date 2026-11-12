import { readDebugScrollAnchorsEnabled } from '@/lib/debugSettings'
import { readStructureBarEnabled } from '@/lib/structureBarSettings'
import { Dispatch, FC, PropsWithChildren, createContext, useContext, useReducer } from 'react'
import type { ScrollControlSnapshot } from '@shared/lib/session'
import type { ScrollSnapshot } from '@shared/types/scroll'
import type { CoverState } from '@shared/types/cover'

interface Store {
  currentSong?: string | null
  isAdmin?: boolean
  scrollMaster?: boolean
  scrollControl?: ScrollControlSnapshot | null
  scrollSnapshot?: ScrollSnapshot | null
  songKey?: string
  chordsEnabled: boolean
  transpo: number
  transpoOpen: boolean
  songsFolder?: string
  songsFolderOpen: boolean
  hostUrl: string
  searchOpen: boolean
  suggestionOpen: boolean
  qrCodeOpen: boolean
  settingsOpen: boolean
  guitaristMode: boolean
  drummerMode: boolean
  musicienScroll: boolean
  aiSearchOpen: boolean
  aiPreviewOpen: boolean
  openAIKeyModalOpen: boolean
  /** Admin-only: overlay section/break scroll anchors (persisted in localStorage). */
  debugScrollAnchors: boolean
  /** Cover image shown over guest screens (⌘Y / ⌘U / ⌘I on the admin). */
  cover: CoverState | null
  /** Structure bar on the right of the song (per device, persisted in localStorage). */
  structureBar: boolean
}

const initialStore: Store = {
  chordsEnabled: true,
  transpo: 0,
  transpoOpen: false,
  songsFolderOpen: false,
  hostUrl: '',
  searchOpen: false,
  suggestionOpen: false,
  qrCodeOpen: false,
  settingsOpen: false,
  guitaristMode: false,
  drummerMode: false,
  musicienScroll: false,
  aiSearchOpen: false,
  aiPreviewOpen: false,
  openAIKeyModalOpen: false,
  debugScrollAnchors: readDebugScrollAnchorsEnabled(),
  cover: null,
  structureBar: readStructureBarEnabled()
}

const StoreContext = createContext<Store>(initialStore)

// @ts-expect-error context will be properly initialized at runtime
const DispatchContext = createContext<Dispatch<Partial<Store>>>(null)

function storeReducer(state: Store, newState: Partial<Store>): Store {
  return {
    ...state,
    ...newState
  }
}

export const StoreProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(storeReducer, initialStore)

  return (
    <StoreContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

export function useDispatch() {
  return useContext(DispatchContext)
}
