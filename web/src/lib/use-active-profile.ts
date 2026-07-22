import { useActiveProfileId } from './active-profile-context'
import { useMe } from './auth'
import { useProfiles } from './profiles'
import type { Profile } from './schemas'

// Resolves which learner is active — the one way for the whole app, so no call
// site reaches for profiles[0]. A family picks explicitly on /who
// (activeProfileId carries that choice); an individual is its own sole learner,
// with a single profile auto-created at onboarding (auth/handlers.go), so there
// is exactly one to resolve. Returns a null profile once loaded when a family
// hasn't picked yet — the caller decides where to send them.
export function useActiveProfile(): {
  profile: Profile | null
  isLoading: boolean
} {
  const { data: me } = useMe()
  const { data: profiles } = useProfiles()
  const { activeProfileId } = useActiveProfileId()

  if (!me || profiles === undefined) return { profile: null, isLoading: true }

  const profile =
    me.role === 'individual'
      ? (profiles[0] ?? null)
      : (profiles.find((p) => p.id === activeProfileId) ?? null)

  return { profile, isLoading: false }
}
