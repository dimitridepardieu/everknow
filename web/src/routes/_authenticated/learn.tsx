import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'

import { Sparkle } from '@/components/sparkle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { useLogout, useMe } from '@/lib/auth'
import { useProfiles } from '@/lib/profiles'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/learn')({
  component: LearnPage,
})

function LearnPage() {
  const { data: me } = useMe()
  const { data: profiles } = useProfiles()
  const { setActiveProfileId } = useActiveProfileId()
  const { profile: activeProfile } = useActiveProfile()
  const navigate = useNavigate()
  const mutation = useLogout()

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

  const handleLogout = async () => {
    await mutation.mutateAsync()
    // Drop the picked profile so the next account on this browser starts clean.
    setActiveProfileId(null)
    void navigate({ to: '/' })
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
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Colle une leçon et Pip la transforme en flashcards.
          </p>
          <Button onClick={() => void navigate({ to: '/create' })}>
            <Sparkle size={18} />
            Créer des cartes
          </Button>
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
