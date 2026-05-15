import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUpdateRole } from '@/lib/auth'
import type { Role } from '@/lib/schemas'

export const Route = createFileRoute('/_app/onboarding')({
  beforeLoad: ({ context }) => {
    if (context.me.role) {
      throw redirect({ to: '/learn' })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const mutation = useUpdateRole()

  const handleChoice = async (role: Role) => {
    await mutation.mutateAsync(role)
    void navigate({ to: '/learn' })
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
            onClick={() => handleChoice('parent')}
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            Je suis un parent
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleChoice('student')}
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            J’apprends pour moi
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
