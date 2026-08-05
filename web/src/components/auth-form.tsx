import { revalidateLogic, useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'

import { AuthLinkExpired } from '@/components/auth-link-expired'
import { AuthSent } from '@/components/auth-sent'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestMagicLink } from '@/lib/auth'
import { emailSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

// invalid_or_expired_token has its own screen; these rarer codes surface as
// an inline notice on the email form so they never fail silently.
const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Le lien est incomplet. Demande un nouveau lien.',
  internal: 'Une erreur est survenue. Réessaie dans un instant.',
}

interface AuthFormProps {
  readonly mode: 'login' | 'register'
  readonly errorCode?: string
}

export function AuthForm({ mode, errorCode }: AuthFormProps) {
  const isSignup = mode === 'register'
  const mutation = useRequestMagicLink()

  const form = useForm({
    defaultValues: { email: '' },
    // Nothing is flagged until the first submit, then the error corrects
    // itself as the address is fixed. Typing "s" must not be an error yet.
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.email.trim().toLowerCase())
    },
  })

  // An expired or already-used magic link redirects here — give it the
  // dedicated screen instead of a terse inline alert.
  if (errorCode === 'invalid_or_expired_token') {
    return <AuthLinkExpired mode={mode} />
  }

  const noticeMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.internal)
    : null

  // Once the link is on its way, the same screen becomes "check your mail".
  if (mutation.isSuccess) {
    return (
      <AuthSent
        email={form.state.values.email.trim().toLowerCase()}
        isSignup={isSignup}
        onResend={() => void form.handleSubmit()}
      />
    )
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-7 sm:py-5">
        <Link
          to="/"
          aria-label="Fermer"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'text-ink-muted',
          )}
        >
          <X className="size-[22px]" strokeWidth={3} />
        </Link>
        <Link
          to={isSignup ? '/login' : '/register'}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'text-primary px-5',
          )}
        >
          {isSignup ? 'Se connecter' : 'S’inscrire'}
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-8 sm:px-6 sm:pb-10">
        <form
          // type="email" is kept for the mobile keyboard and autocomplete, but
          // its native check would intercept the submit with a browser bubble
          // for some addresses and let others (d@d) through to Zod.
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="flex w-full max-w-[380px] flex-col gap-[22px]"
        >
          <h1 className="font-heading text-center text-[32px] leading-[1.1] font-semibold">
            {isSignup ? <>Bienvenue&nbsp;!</> : 'Connexion'}
          </h1>

          {noticeMessage && (
            <p className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-bold">
              {noticeMessage}
            </p>
          )}

          <form.Field
            name="email"
            validators={{
              onDynamic: ({ value }) => {
                const result = emailSchema.safeParse(value)
                return result.success
                  ? undefined
                  : result.error.issues[0]?.message
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
                    className="text-ink placeholder:text-ink-muted border-input focus-visible:border-primary aria-invalid:border-destructive-dark h-[58px] rounded-lg border-2 bg-white px-4 text-[17px] font-bold focus-visible:ring-0 aria-invalid:ring-0 md:text-[17px]"
                  />
                  {showError ? (
                    <p className="text-destructive-dark flex items-start gap-[7px] text-[13px] leading-[1.4] font-extrabold">
                      <span
                        aria-hidden
                        className="bg-destructive-dark mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-black text-white"
                      >
                        !
                      </span>
                      {field.state.meta.errors[0]}
                    </p>
                  ) : (
                    isSignup && (
                      <p className="text-ink-soft text-[12.5px] font-bold">
                        Nous t’enverrons un lien d’activation pour créer ton
                        compte.
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
              : isSignup
                ? 'Créer mon compte'
                : 'Se connecter'}
          </Button>

          {mutation.isError && (
            <p className="text-destructive mx-1 text-xs font-bold">
              Impossible d’envoyer le lien. Réessaie.
            </p>
          )}

          <p className="text-ink-soft text-center text-xs leading-[1.6] font-bold">
            En continuant, tu acceptes nos{' '}
            <u className="underline-offset-2">Conditions d’utilisation</u> et
            notre{' '}
            <u className="underline-offset-2">Politique de confidentialité</u>.
          </p>
        </form>
      </div>
    </main>
  )
}
