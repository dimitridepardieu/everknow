import { createContext, useContext } from 'react'

export interface ActiveProfileContextValue {
  activeProfileId: number | null
  setActiveProfileId: (id: number | null) => void
}

export const ActiveProfileContext =
  createContext<ActiveProfileContextValue | null>(null)

export function useActiveProfileId() {
  const ctx = useContext(ActiveProfileContext)
  if (!ctx) {
    throw new Error(
      'useActiveProfileId must be used within ActiveProfileProvider',
    )
  }
  return ctx
}
