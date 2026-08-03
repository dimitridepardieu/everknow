import { Navigate, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { Eve } from '@/components/eve'
import { Button } from '@/components/ui/button'
import { useMe, useUpdateRole } from '@/lib/auth'
import type { Role } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingPage,
})

const ROLES: ReadonlyArray<{
  role: Role
  emoji: string
  gradient: string
  title: string
  description: string
}> = [
  {
    role: 'individual',
    emoji: '👧',
    gradient: 'linear-gradient(135deg, #FFC93C 0%, #FF8FB1 100%)',
    title: 'Je suis un élève',
    description: 'Je veux apprendre avec Eve et mes flashcards',
  },
  {
    role: 'family',
    emoji: '👨‍👧',
    gradient: 'linear-gradient(135deg, #3DA9FC 0%, #2A6FDB 100%)',
    title: 'Je suis une famille',
    description: 'Je gère les profils de mes enfants (jusqu’à 5)',
  },
]

function OnboardingPage() {
  const { data: me } = useMe()
  const mutation = useUpdateRole()

  // Auto-redirect once the role lands: the mutation invalidates useMe(), this
  // re-renders with the new role, and <Navigate> takes over. No manual push.
  if (me?.role) return <Navigate to="/learn" />

  const choose = (role: Role) => mutation.mutate(role)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-9">
      <div className="mb-6 flex flex-col items-center text-center">
        <Eve size={110} mood="soft.hello" />
        <p className="font-heading text-success-dark mt-2 text-xs font-semibold tracking-[1.5px] uppercase">
          ✓ Compte créé
        </p>
        <h1 className="font-heading mt-1 text-[26px] leading-tight font-semibold">
          Tu es qui pour Eve ?
        </h1>
        <p className="text-ink-soft mt-2 text-sm font-bold">
          On adapte ton expérience à ton rôle.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ROLES.map((r) => (
          <Button
            key={r.role}
            variant="secondary"
            onClick={() => choose(r.role)}
            disabled={mutation.isPending}
            className="h-auto w-full justify-start gap-4 rounded-[22px] p-4 text-left tracking-normal normal-case"
          >
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: r.gradient }}
            >
              {r.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-ink block text-lg font-semibold">
                {r.title}
              </span>
              <span className="text-ink-muted mt-1 block font-sans text-xs font-bold">
                {r.description}
              </span>
            </span>
            <ArrowRight className="text-ink-muted shrink-0" strokeWidth={3} />
          </Button>
        ))}
      </div>

      <p className="text-ink-muted font-heading mt-5 text-center text-xs font-medium">
        Tu pourras changer plus tard dans les réglages.
      </p>
    </main>
  )
}
