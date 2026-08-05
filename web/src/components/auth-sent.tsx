import { useEffect, useState } from 'react'

import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'

import { Eve } from '@/components/eve'
import { Sparkle } from '@/components/sparkle'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <main className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center px-4 py-4 sm:px-7 sm:py-5">
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
      </header>

      <div className="flex flex-1 items-center justify-center px-5 sm:px-6">
        <div className="flex w-full max-w-[380px] flex-col gap-[22px]">
          <EveWithEnvelope />

          <div>
            <p className="font-heading text-ink-soft text-center text-[13px] font-semibold tracking-[2.4px] uppercase">
              Lien envoyé&nbsp;!
            </p>
            <h1 className="font-heading mt-1 text-center text-[32px] leading-[1.1] font-semibold">
              Vérifie ta boîte mail
            </h1>
            <p className="text-ink-soft mt-2.5 text-center text-sm leading-[1.45] font-bold text-balance">
              On a envoyé un lien à
            </p>
            <p className="bg-primary-soft text-primary font-heading mt-2.5 mb-3 rounded-xl px-4 py-[11px] text-center text-[17px] font-semibold break-all">
              {email}
            </p>
            <p className="text-ink-soft text-center text-sm leading-[1.45] font-bold">
              Clique dessus pour{' '}
              {isSignup ? 'activer ton compte' : 'te connecter'}.
              <br />
              Le lien est valable 15 minutes.
            </p>
          </div>
        </div>
      </div>

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
    </main>
  )
}

// Eve perched on a paper envelope with a gold stamp — the celebratory
// "we sent it" illustration. Fixed at 180px; positions are pixel-tuned, so
// inline styles (clip-path, gradients) are clearer here than utilities.
function EveWithEnvelope() {
  return (
    <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
      {/* envelope */}
      <div
        className="absolute bottom-1.5 left-1/2 overflow-hidden rounded-lg bg-white shadow-[0_6px_0_var(--border),inset_0_0_0_2px_var(--border)]"
        style={{
          width: 140,
          height: 99,
          transform: 'translateX(-50%) rotate(-4deg)',
        }}
      >
        {/* flap */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: '60%',
            background: 'linear-gradient(180deg, #F4EFE5 0%, #E6E0D0 100%)',
            clipPath: 'polygon(0 0, 100% 0, 50% 80%)',
          }}
        />
        {/* address lines */}
        <div className="absolute inset-x-4 bottom-3 flex flex-col gap-1">
          <div className="bg-border h-[3px] w-[70%] rounded-full" />
          <div className="bg-border h-[3px] w-[50%] rounded-full" />
        </div>
      </div>

      {/* stamp */}
      <div
        className="bg-gold absolute right-3 bottom-5 flex items-center justify-center shadow-[0_2px_0_var(--gold-dark)]"
        style={{ width: 30, height: 36, transform: 'rotate(8deg)' }}
      >
        <Sparkle size={18} className="text-white" />
      </div>

      {/* Eve on top */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
        <Eve size={108} mood="soft.cheer" />
      </div>

      {/* floating sparkles */}
      <Sparkle size={14} className="text-gold absolute top-0 left-2" />
      <Sparkle size={12} className="text-pink absolute top-3.5 right-0" />
      <Sparkle size={10} className="text-primary absolute top-12 left-0" />
    </div>
  )
}
