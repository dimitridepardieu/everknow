import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { ActiveProfileContext } from './active-profile-context'

// Which learner is currently training. Client-only and per-launch by design:
// the "who is training?" screen re-picks each time a shared family phone is
// opened, so this lives in localStorage, not on the session.
const STORAGE_KEY = 'everknow_active_profile_id'

function readStored(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

export function ActiveProfileProvider({
  children,
}: {
  readonly children: ReactNode
}) {
  const [activeProfileId, setId] = useState<number | null>(readStored)

  // Persist in the same handler that updates state — no effect needed, the
  // write is driven by the pick event, not by a render.
  const setActiveProfileId = useCallback((id: number | null) => {
    if (id === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(id))
    setId(id)
  }, [])

  const value = useMemo(
    () => ({ activeProfileId, setActiveProfileId }),
    [activeProfileId, setActiveProfileId],
  )

  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  )
}
