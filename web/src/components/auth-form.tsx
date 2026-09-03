import { useState } from 'react'

import { revalidateLogic, useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'

import { AuthSent } from '@/components/auth-sent'
import { AuthShell } from '@/components/auth-shell'
import { EveEnvelope } from '@/components/eve-envelope'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useRequestMagicLink } from '@/lib/auth'
import { emailSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

// invalid_or_expired_token rewrites the whole screen; these rarer codes
// surface as an inline notice so they never fail silently.
const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Le lien est incomplet. Demande un nouveau lien.',
  internal: 'Une erreur est survenue. Réessaie dans un instant.',
}

// The limiter counts by IP and by address, and the 429 deliberately hides
// which one tripped so addresses cannot be enumerated — this message has to
// stay just as silent about it. Telling the wait is safe: it is already in
// the Retry-After header, and "réessaie" alone would be a lie for an hour.
function requestErrorToast(error: unknown): {
  title: string
  description: string
} {
  if (!(error instanceof ApiError) || error.code !== 'rate_limited') {
    return {
      title: 'Impossible d’envoyer le lien',
      description: 'Réessaie dans quelques instants.',
    }
  }
  return {
    title: 'Trop de demandes',
    description: `Réessaie ${retryDelay(error.retryAfter)}.`,
  }
}

function retryDelay(seconds: number | undefined): string {
  if (seconds === undefined) return 'plus tard'
  if (seconds < 60) {
    return `dans ${String(seconds)} seconde${seconds > 1 ? 's' : ''}`
  }
  const minutes = Math.ceil(seconds / 60)
  return `dans ${String(minutes)} minute${minutes > 1 ? 's' : ''}`
}

interface AuthFormProps {
  readonly mode: 'login' | 'register'
  readonly errorCode?: string
}

export function AuthForm({ mode, errorCode }: AuthFormProps) {
  const isSignup = mode === 'register'
  const mutation = useRequestMagicLink()
  // The address a link actually went to. Its presence is what puts the screen
  // on "check your mail", and its value is what that screen names — one state
  // rather than a flag beside an address read back out of the field.
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    // Nothing is flagged until the first submit, then the error corrects
    // itself as the address is fixed. Typing "s" must not be an error yet.
    validationLogic: revalidateLogic(),
    onSubmit: ({ value }) => {
      const email = value.email.trim().toLowerCase()
      mutation.mutate(email, {
        onSuccess: () => {
          setSentTo(email)
        },
        onError: (error) => {
          toast.add({ type: 'error', ...requestErrorToast(error) })
        },
      })
    },
  })

  // An expired or already-used magic link redirects here. Same form, same
  // field: asking for another link is exactly asking for a first one, so the
  // screen only changes what it says.
  const isExpired = errorCode === 'invalid_or_expired_token'

  // Failing to send raises a toast; this one is the state the page arrived
  // in, so it stays on the page rather than fading out of it.
  const noticeMessage =
    errorCode && !isExpired
      ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.internal)
      : null

  const hint = isExpired
    ? `Nous t’enverrons un nouveau lien pour ${isSignup ? 'activer ton compte' : 'te connecter'}.`
    : isSignup
      ? 'Nous t’enverrons un lien d’activation pour créer ton compte.'
      : null

  // Once a link has gone out, the screen stays on "check your mail" — not
  // mutation.isSuccess, which drops back to false for the length of a resend
  // and would flash the form back for a round trip.
  if (sentTo !== null) {
    return (
      <AuthSent
        email={sentTo}
        isSignup={isSignup}
        onResend={() => void form.handleSubmit()}
      />
    )
  }

  return (
    <AuthShell
      action={
        isExpired ? undefined : (
          <Link
            to={isSignup ? '/login' : '/register'}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'text-primary px-5',
            )}
          >
            {isSignup ? 'Se connecter' : 'S’inscrire'}
          </Link>
        )
      }
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {isExpired && <EveEnvelope cold />}

      <div>
        <h1 className="font-heading text-center text-[32px] leading-[1.1] font-semibold">
          {isExpired ? (
            'Ce lien a expiré'
          ) : isSignup ? (
            <>Bienvenue&nbsp;!</>
          ) : (
            'Connexion'
          )}
        </h1>
        {isExpired && (
          <p className="text-ink-soft mt-2.5 text-center text-sm leading-[1.45] font-bold text-balance">
            Les liens {isSignup ? 'd’activation' : 'de connexion'} expirent au
            bout de 15 minutes, pour protéger ton compte.
          </p>
        )}
      </div>

      {noticeMessage && (
        <Alert variant="error">
          <XIcon strokeWidth={3.2} />
          <AlertDescription>{noticeMessage}</AlertDescription>
        </Alert>
      )}

      <form.Field
        name="email"
        validators={{
          onDynamic: ({ value }) => {
            const result = emailSchema.safeParse(value.trim())
            return result.success ? undefined : result.error.issues[0]?.message
          },
        }}
      >
        {(field) => {
          const showError = field.state.meta.errors.length > 0
          return (
            <div className="flex flex-col gap-2.5">
              <Label htmlFor={field.name} className="sr-only">
                Ton email
              </Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="E-mail"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={showError}
                aria-describedby={showError ? `${field.name}-error` : undefined}
                className="text-ink placeholder:text-ink-muted border-input focus-visible:border-primary aria-invalid:border-destructive-dark h-[58px] rounded-lg border-2 bg-white px-4 text-[17px] font-bold focus-visible:ring-0 aria-invalid:ring-0 md:text-[17px]"
              />
              {showError ? (
                <FieldError id={`${field.name}-error`}>
                  {field.state.meta.errors[0]}
                </FieldError>
              ) : (
                hint && (
                  <p className="text-ink-soft text-[12.5px] font-bold">
                    {hint}
                  </p>
                )
              )}
            </div>
          )
        }}
      </form.Field>

      <Button
        type="submit"
        size="lg"
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending
          ? 'Envoi…'
          : isExpired
            ? 'Renvoyer un lien'
            : isSignup
              ? 'Créer mon compte'
              : 'Se connecter'}
      </Button>

      <p className="text-ink-soft text-center text-xs leading-[1.6] font-bold">
        En continuant, tu acceptes nos{' '}
        <u className="underline-offset-2">Conditions d’utilisation</u> et notre{' '}
        <u className="underline-offset-2">Politique de confidentialité</u>.
      </p>
    </AuthShell>
  )
}
