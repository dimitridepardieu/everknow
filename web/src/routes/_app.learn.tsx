import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogout } from '@/lib/auth'

export const Route = createFileRoute('/_app/learn')({
  beforeLoad: ({ context }) => {
    if (!context.me.role) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: LearnPage,
})

function LearnPage() {
  const { me } = Route.useRouteContext()
  const navigate = useNavigate()
  const mutation = useLogout()

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
          className="cursor-pointer"
        >
          Déconnexion
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Bonjour !</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Tu es connecté en tant que <strong>{me.role}</strong>.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Le reste de l’app arrive bientôt.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
