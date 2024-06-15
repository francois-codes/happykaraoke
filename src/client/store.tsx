import { FC, PropsWithChildren, Dispatch, createContext, useContext, useReducer } from 'react'

interface Store {
  currentSong: string | null
}

const initialStore: Store = {
  currentSong: null
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
