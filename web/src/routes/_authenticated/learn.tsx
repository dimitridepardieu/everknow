import {
  Link,
  Navigate,
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router'

import { EveAvatar } from '@/components/eve-avatar'
import { Button } from '@/components/ui/button'
import { useMe } from '@/lib/auth'
import { useDueCards } from '@/lib/cards'
import { profileColor } from '@/lib/profile-color'
import { useProfiles } from '@/lib/profiles'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/learn')({
  component: LearnPage,
})

function LearnPage() {
  const { data: me } = useMe()
  const { data: profiles } = useProfiles()
  const { profile: activeProfile } = useActiveProfile()
  const { data: dueCards } = useDueCards(activeProfile?.id)
  const navigate = useNavigate()

  // _authenticated guarantees me is non-null here (it redirects to /login
  // otherwise), but TS doesn't know that. Bail defensively rather than assert.
  if (!me) return null
  if (!me.role) return <Navigate to="/onboarding" />
  if (profiles === undefined) return null

  // A family that hasn't picked a learner goes to /who — or straight to
  // creation if it has no profiles yet. (An individual always resolves to its
  // sole profile, so this only gates families.)
  if (me.role === 'family' && !activeProfile) {
    return <Navigate to={profiles.length === 0 ? '/profiles/new' : '/who'} />
  }

  const activeIndex = profiles.findIndex((p) => p.id === activeProfile?.id)
  const color = profileColor(activeIndex)

  // undefined while the list loads, so the "à jour" hero never flashes before
  // the real count lands (the query always refetches on entry).
  const dueCount = dueCards?.length
  const hasDue = dueCount !== undefined && dueCount > 0

  return (
    <main className="flex min-h-dvh flex-col pb-9">
      {/* Header hugs the viewport's left edge (px-6 pt-6, matching FlowHeader)
          so "Salut, {name}" sits top-left on desktop instead of floating inside
          the centered column below. */}
      <header className="flex items-center gap-3.5 px-6 pt-6">
        <Link to="/account" aria-label="Profil" className="cursor-pointer">
          <EveAvatar color={color} size={40} />
        </Link>
        <p className="font-heading text-ink-soft text-sm font-semibold">
          Salut, <span className="text-ink">{activeProfile?.name}</span>
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {dueCount !== undefined &&
            (hasDue ? (
              <div>
                <h1 className="font-heading text-[36px] leading-[1.05] font-semibold">
                  <span className="text-primary-dark">
                    {dueCount} carte{dueCount > 1 ? 's' : ''}
                  </span>
                  <br />
                  aujourd’hui
                </h1>
              </div>
            ) : (
              <div>
                <h1 className="font-heading text-[34px] leading-[1.15] font-semibold">
                  Tout est calme.
                </h1>
                <p className="text-ink-soft mx-auto mt-3 max-w-[280px] text-sm font-bold">
                  Tes cartes reviendront au bon moment.
                  <br />
                  Le repos fait partie du jeu.
                </p>
              </div>
            ))}
        </div>

        {dueCount !== undefined && (
          <div className="flex flex-col gap-2.5">
            {hasDue ? (
              <>
                <Button onClick={() => void navigate({ to: '/train' })}>
                  Commencer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate({ to: '/create' })}
                >
                  Créer des cartes
                </Button>
              </>
            ) : (
              <Button onClick={() => void navigate({ to: '/create' })}>
                Créer des cartes
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
