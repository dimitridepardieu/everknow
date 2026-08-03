import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { EveAvatar } from '@/components/eve-avatar'
import { FlowHeader } from '@/components/flow-header'
import { Button } from '@/components/ui/button'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { useLogout, useMe } from '@/lib/auth'
import { profileColor } from '@/lib/profile-color'
import { useProfiles } from '@/lib/profiles'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/account')({
  component: AccountPage,
})

function AccountPage() {
  const { data: me } = useMe()
  const { data: profiles } = useProfiles()
  const { profile: activeProfile } = useActiveProfile()
  const { setActiveProfileId } = useActiveProfileId()
  const navigate = useNavigate()
  const logout = useLogout()

  if (!me) return null

  const activeIndex =
    profiles?.findIndex((p) => p.id === activeProfile?.id) ?? -1
  const color = profileColor(activeIndex)

  const handleLogout = async () => {
    await logout.mutateAsync()
    // Drop the picked profile so the next account on this browser starts clean.
    setActiveProfileId(null)
    void navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-dvh flex-col pb-9">
      <FlowHeader
        variant="back"
        title="Profil"
        onActivate={() => void navigate({ to: '/learn' })}
      />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="mt-6 flex flex-col items-center">
          <EveAvatar color={color} size={104} />
          {activeProfile?.name && (
            <p className="font-heading text-ink mt-3 text-xl font-semibold">
              {activeProfile.name}
            </p>
          )}
        </div>

        <div className="mt-10 flex flex-1 flex-col gap-3">
          {me.role === 'family' && (
            <Button
              variant="secondary"
              onClick={() => void navigate({ to: '/who' })}
            >
              Changer de profil
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-ink-muted text-sm">{me.email}</p>
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="text-destructive"
          >
            <LogOut className="size-5" strokeWidth={2.5} />
            Déconnexion
          </Button>
        </div>
      </div>
    </main>
  )
}
