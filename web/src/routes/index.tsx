import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { meQueryOptions } from '@/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (me) {
      throw redirect({ to: me.role ? '/learn' : '/onboarding' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <Card>
        <CardHeader>
          <CardTitle>Flashcard Academy</CardTitle>
          <CardDescription>
            Les flashcards générées par IA, validées par les parents, apprises
            par les enfants.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link to="/login" className={buttonVariants()}>
            Se connecter
          </Link>
          <Link
            to="/register"
            className={buttonVariants({ variant: 'outline' })}
          >
            Créer un compte
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
