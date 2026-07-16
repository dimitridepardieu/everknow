import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Button, buttonVariants } from '@/components/ui/button'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { useProfiles } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/who')({
  component: WhoPage,
})

function WhoPage() {
  const { data: profiles } = useProfiles()
  const { setActiveProfileId } = useActiveProfileId()
  const navigate = useNavigate()

  if (profiles === undefined) return null

  const pick = (id: number) => {
    setActiveProfileId(id)
    void navigate({ to: '/learn' })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <Pip size={88} mood="happy" />
        <h1 className="font-heading mt-3 text-[26px] font-semibold">
          Qui révise ?
        </h1>
        <p className="text-ink-soft mt-1 text-sm font-bold">
          Choisis ton profil pour commencer.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-soft text-sm font-bold">
            Aucun profil pour l’instant.
          </p>
          <Link to="/profile-new" className={buttonVariants()}>
            <Plus className="size-5" strokeWidth={3} />
            Créer un profil
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              onClick={() => pick(p.id)}
              className="h-14 justify-start text-base"
            >
              {p.name ?? 'Sans nom'}
            </Button>
          ))}
          <Link
            to="/profile-new"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'text-ink-soft mt-1 gap-2',
            )}
          >
            <Plus className="size-5" strokeWidth={3} />
            Ajouter un profil
          </Link>
        </div>
      )}
    </main>
  )
}
