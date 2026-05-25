import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Link2 } from 'lucide-react'

import { AuthLinkExpired } from '@/components/auth-link-expired'
import { AuthSent } from '@/components/auth-sent'
import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestMagicLink } from '@/lib/auth'
import { emailSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

const TRUST_SIGNALS = [
  'Pas de mot de passe à retenir',
  'Pas de carte bancaire pour commencer',
  'Conforme RGPD, données protégées',
]

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[50px] pb-9">
      <div>
        <Link
          to="/"
          aria-label="Retour"
          className="text-ink-muted hover:bg-foreground/5 flex size-9 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={3} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col pt-2">
        <div className="mb-2 flex justify-center">
          <Pip size={96} mood={isSignup ? 'cheer' : 'happy'} />
        </div>
        <div className="mb-6 text-center">
          <h1 className="font-heading text-[28px] leading-tight font-semibold">
            {isSignup ? 'Bienvenue !' : 'Heureux de te revoir !'}
          </h1>
          <p className="text-ink-soft mt-2 text-sm font-bold">
            {isSignup
              ? 'On t’envoie un lien magique. Pas de mot de passe à retenir.'
              : 'On t’envoie un lien magique par email.'}
          </p>
        </div>

        {noticeMessage && (
          <p className="bg-destructive/10 text-destructive mb-4 rounded-xl px-4 py-3 text-sm font-bold">
            {noticeMessage}
          </p>
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
            {(field) => {
              const valid = emailSchema.safeParse(field.state.value).success
              const showError =
                field.state.meta.isTouched && field.state.meta.errors.length > 0
              return (
                <>
                  <Label
                    htmlFor={field.name}
                    className="font-heading text-ink-muted mb-2 block text-xs font-semibold tracking-[1.5px] uppercase"
                  >
                    Ton email
                  </Label>
                  <div className="relative">
                    <Link2
                      className={cn(
                        'pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2',
                        valid ? 'text-primary' : 'text-ink-muted',
                      )}
                    />
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="prenom@email.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="text-ink placeholder:text-ink-muted border-border focus-visible:border-primary h-auto rounded-2xl border-2 bg-white py-3.5 pr-4 pl-12 text-[18px] font-semibold shadow-[0_4px_0_#1b1b3a14] transition-shadow focus-visible:shadow-[0_4px_0_var(--primary-dark)] focus-visible:ring-0 md:text-[18px]"
                    />
                  </div>
                  <p className="text-ink-muted mx-1 mt-2.5 text-xs font-bold">
                    🪄 On t’enverra un lien à cliquer pour{' '}
                    {isSignup ? 'créer ton compte' : 'te connecter'}.
                  </p>
                  {showError && (
                    <p className="text-destructive mx-1 mt-2 text-xs font-bold">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </>
              )
            }}
          </form.Field>
        </form>

        {isSignup && (
          <div className="bg-success-soft mt-[18px] flex flex-col gap-1.5 rounded-2xl px-3.5 py-3">
            {TRUST_SIGNALS.map((signal) => (
              <div
                key={signal}
                className="text-success-dark flex items-center gap-2 text-xs font-bold"
              >
                <span className="bg-success flex size-[18px] shrink-0 items-center justify-center rounded-full text-white">
                  <Check className="size-3" strokeWidth={4} />
                </span>
                {signal}
              </div>
            ))}
          </div>
        )}

        {mutation.isError && (
          <p className="text-destructive mx-1 mt-4 text-xs font-bold">
            Impossible d’envoyer le lien. Réessaie.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <form.Subscribe selector={(s) => s.values.email}>
          {(email) => (
            <Button
              type="submit"
              form="auth-form"
              disabled={
                mutation.isPending ||
                !emailSchema.safeParse(email.trim()).success
              }
              className="w-full"
            >
              <Sparkle size={18} />
              {mutation.isPending ? 'Envoi…' : 'Recevoir mon lien magique'}
            </Button>
          )}
        </form.Subscribe>

        <p className="text-ink-soft font-heading text-center text-[13px] font-medium">
          {isSignup ? 'Tu as déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <Link
            to={isSignup ? '/login' : '/register'}
            className="text-primary font-semibold underline underline-offset-4"
          >
            {isSignup ? 'Se connecter' : 'Créer un compte'}
          </Link>
        </p>

        {isSignup && (
          <p className="text-ink-muted font-heading text-center text-[10px] leading-relaxed font-medium">
            En continuant, tu acceptes nos <u>CGU</u> et notre{' '}
            <u>Politique de confidentialité</u>.
          </p>
        )}
      </div>
    </main>
  )
}
