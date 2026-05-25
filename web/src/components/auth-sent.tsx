import { useEffect, useState } from 'react'

import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'

// Backend rate-limits to 3 requests/hour per email; a short cooldown keeps
// users from hammering "resend" and burning that budget by accident.
const RESEND_COOLDOWN_SECONDS = 30

// Quick links to the common webmail inboxes (no reliable way to open a
// native mail app from the web).
const MAIL_APPS = [
  { label: 'Gmail', href: 'https://mail.google.com' },
  { label: 'Outlook', href: 'https://outlook.live.com' },
  { label: 'iCloud', href: 'https://www.icloud.com/mail' },
]

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

      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <PipWithEnvelope />

        <div>
          <p className="font-heading text-ink-muted text-xs font-medium tracking-[1.5px] uppercase">
            Lien envoyé&nbsp;!
          </p>
          <h1 className="font-heading mt-1 text-[28px] leading-tight font-semibold">
            Vérifie ta boîte mail 📬
          </h1>
          <p className="text-ink-soft mt-3 text-sm font-bold">
            On a envoyé un lien magique à
          </p>
          <p className="text-primary font-heading mt-1 text-[17px] font-semibold">
            {email}
          </p>
          <p className="text-ink-muted mx-4 mt-2 text-[13px] leading-relaxed font-bold">
            Clique dessus pour {isSignup ? 'créer ton compte' : 'te connecter'}.
            Le lien est valable 15 minutes.
          </p>
        </div>

        <div className="flex w-full gap-2.5">
          {MAIL_APPS.map((app) => (
            <a
              key={app.label}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-heading text-ink flex flex-1 cursor-pointer items-center justify-center rounded-2xl bg-white px-2 py-3 text-[13px] font-semibold shadow-[inset_0_0_0_2px_var(--border),0_3px_0_var(--border)]"
            >
              {app.label}
            </a>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-ink-soft font-heading text-[13px] font-medium">
          Tu n’as rien reçu&nbsp;?
        </p>
        <button
          type="button"
          disabled={!canResend}
          onClick={() => {
            onResend()
            setSecondsLeft(RESEND_COOLDOWN_SECONDS)
          }}
          className="text-primary font-heading disabled:text-ink-muted cursor-pointer px-3 py-1.5 text-sm font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline"
        >
          {canResend
            ? 'Renvoyer le lien'
            : `Renvoyer le lien (dans ${secondsLeft}s)`}
        </button>
      </div>
    </main>
  )
}

// Pip perched on a paper envelope with a gold stamp — the celebratory
// "we sent it" illustration. Fixed at 180px; positions are pixel-tuned, so
// inline styles (clip-path, gradients) are clearer here than utilities.
function PipWithEnvelope() {
  return (
    <div className="relative" style={{ width: 180, height: 180 }}>
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

      {/* Pip on top */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
        <Pip size={108} mood="cheer" />
      </div>

      {/* floating sparkles */}
      <Sparkle size={14} className="text-gold absolute top-0 left-2" />
      <Sparkle size={12} className="text-pink absolute top-3.5 right-0" />
      <Sparkle size={10} className="text-primary absolute top-12 left-0" />
    </div>
  )
}
