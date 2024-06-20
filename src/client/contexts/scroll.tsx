import { FC, PropsWithChildren, RefObject, createContext, useContext } from 'react'

// @ts-expect-error context will be correctly initialized at runtime
const ScrollContext = createContext<RefObject<HTMLDivElement>>(null)

export const ScrollProvider: FC<PropsWithChildren<{ scrollRef: RefObject<HTMLDivElement> }>> = ({
  children,
  scrollRef
}) => {
  return <ScrollContext.Provider value={scrollRef}>{children}</ScrollContext.Provider>
}

export function useScrollContext() {
  return useContext(ScrollContext)
}
