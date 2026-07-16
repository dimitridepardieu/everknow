import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { useLogout, useMe } from '@/lib/auth'
import { useProfiles } from '@/lib/profiles'

export const Route = createFileRoute('/_authenticated/learn')({
  component: LearnPage,
})

function LearnPage() {
  const { data: me } = useMe()
  const { data: profiles } = useProfiles()
  const { activeProfileId } = useActiveProfileId()
  const navigate = useNavigate()
  const mutation = useLogout()

  // _authenticated guarantees me is non-null here (it redirects to /login
  // otherwise), but TS doesn't know that. Bail defensively rather than assert.
  if (!me) return null
  if (!me.role) return <Navigate to="/onboarding" />
  if (profiles === undefined) return null

  // An individual is its own sole learner (one auto-created profile); a family
  // must have picked one on /who. No stored pick for a family → send them there,
  // but a family with no profiles yet skips the empty picker and creates first.
  const activeProfile =
    me.role === 'individual'
      ? (profiles[0] ?? null)
      : (profiles.find((p) => p.id === activeProfileId) ?? null)
  if (me.role === 'family' && !activeProfile) {
    return <Navigate to={profiles.length === 0 ? '/profiles/new' : '/who'} />
  }

  const handleLogout = async () => {
    await mutation.mutateAsync()
    void navigate({ to: '/login' })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-6 py-8">
      <header className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{me.email}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={mutation.isPending}
        >
          Déconnexion
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            Bonjour{activeProfile?.name ? ` ${activeProfile.name}` : ''} !
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Le reste de l’app arrive bientôt.
          </p>
        </CardContent>
      </Card>

      {me.role === 'family' && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onClick={() => void navigate({ to: '/who' })}
        >
          Changer de profil
        </Button>
      )}
    </main>
  )
}
