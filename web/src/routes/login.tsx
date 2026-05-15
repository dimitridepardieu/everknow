import { useForm } from '@tanstack/react-form'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestMagicLink } from '@/lib/auth'
import { emailSchema } from '@/lib/schemas'

const searchSchema = z.object({
  error: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
})

const errorMessages: Record<string, string> = {
  missing_token: 'Le lien est incomplet. Demande un nouveau lien.',
  invalid_or_expired_token:
    'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.',
  internal: 'Une erreur est survenue. Réessaie dans un instant.',
}

function LoginPage() {
  const { error } = useSearch({ from: '/login' })
  return <AuthForm mode="login" errorCode={error} />
}

interface AuthFormProps {
  mode: 'login' | 'register'
  errorCode?: string
}

export function AuthForm({ mode, errorCode }: AuthFormProps) {
  const mutation = useRequestMagicLink()

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.email.trim().toLowerCase())
    },
  })

  const title = mode === 'login' ? 'Connecte-toi' : 'Crée ton compte'
  const description =
    mode === 'login'
      ? 'Entre ton email, on t’envoie un lien magique.'
      : 'Pas de mot de passe à retenir. On t’envoie un lien par email.'

  if (mutation.isSuccess) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <Card>
          <CardHeader>
            <CardTitle>Lien envoyé</CardTitle>
            <CardDescription>
              Vérifie la boîte mail de {form.state.values.email}. Le lien expire
              dans 15 minutes.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {errorCode && errorMessages[errorCode] && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMessages[errorCode]}</AlertDescription>
            </Alert>
          )}

          <form
            id="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const result = emailSchema.safeParse(value)
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="ton@email.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                </div>
              )}
            </form.Field>
          </form>

          {mutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                Impossible d’envoyer le lien. Réessaie.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            form="auth-form"
            disabled={mutation.isPending || !form.state.canSubmit}
            className="w-full cursor-pointer"
          >
            {mutation.isPending ? 'Envoi…' : 'Recevoir le lien magique'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
