import { useEffect, useState } from 'react'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'

// Backend rate-limits to 3 requests/hour per email; a short cooldown keeps
// users from hammering "resend" and burning that budget by accident.
const RESEND_COOLDOWN_SECONDS = 30

interface AuthSentProps {
  readonly email: string
  readonly isSignup: boolean
  readonly onResend: () => void
}

export function AuthSent({ email, isSignup, onResend }: AuthSentProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)

  // One interval for the component's lifetime: it ticks down to zero, and the
  // resend handler resets the counter which this same interval picks up.
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const canResend = secondsLeft <= 0

  return (
    <AuthShell
      bottom={
        <div className="flex shrink-0 flex-col items-center gap-0.5 px-6 pt-6 pb-[34px]">
          <strong className="text-ink text-sm font-extrabold">
            Tu n’as rien reçu&nbsp;?
          </strong>
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={!canResend}
            onClick={() => {
              onResend()
              setSecondsLeft(RESEND_COOLDOWN_SECONDS)
            }}
            className="text-ink-soft hover:text-primary disabled:text-ink-soft text-[13.5px] font-extrabold underline decoration-2 underline-offset-[3px] disabled:no-underline disabled:opacity-100"
          >
            {canResend
              ? 'Renvoyer le lien'
              : `Renvoyer le lien (dans ${secondsLeft} s)`}
          </Button>
        </div>
      }
    >
      <div>
        <h1 className="font-heading text-center text-[32px] leading-[1.1] font-semibold">
          Vérifie ta boîte mail
        </h1>
        <p className="text-ink-soft mt-2.5 text-center text-sm leading-[1.45] font-bold text-balance">
          Nous t’avons envoyé un lien à
        </p>
        <p className="bg-primary-soft text-primary font-heading mt-2.5 mb-3 rounded-xl px-4 py-[11px] text-center text-[17px] font-semibold break-all">
          {email}
        </p>
        <p className="text-ink-soft text-center text-sm leading-[1.45] font-bold">
          Clique dessus pour {isSignup ? 'activer ton compte' : 'te connecter'}.
          <br />
          Le lien est valable 15 minutes.
        </p>
      </div>
    </AuthShell>
  )
}
