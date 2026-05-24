import { Navigate, createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useMe, useUpdateRole } from '@/lib/auth'
import type { Role } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { data: me } = useMe()
  const mutation = useUpdateRole()

  // Auto-redirect once the role lands. After mutation succeeds, useMe()
  // refetches via the invalidated cache, the component re-renders with
  // the new role, and <Navigate> takes the user to /learn — no manual
  // navigate() call needed and no router-context invalidation dance.
  if (me?.role) return <Navigate to="/learn" />

  const handleChoice = (role: Role) => {
    mutation.mutate(role)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle>Bienvenue !</CardTitle>
          <CardDescription>
            Comment utilises-tu Flashcard Academy ?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => handleChoice('family')}
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            Je suis une famille
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleChoice('individual')}
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            Je suis un élève
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
