import { Link } from '@tanstack/react-router'
import { RefreshCw, X } from 'lucide-react'

import { Eve } from '@/components/eve'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AuthLinkExpiredProps {
  readonly mode: 'login' | 'register'
}

// Shown when the verify endpoint bounces an expired or already-used link
// back with ?error=invalid_or_expired_token. We don't carry the email
// across that redirect, so both actions simply return to the email form.
export function AuthLinkExpired({ mode }: AuthLinkExpiredProps) {
  const entry = mode === 'register' ? '/register' : '/login'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[50px] pb-9">
      <div>
        <Link
          to="/"
          aria-label="Fermer"
          className="text-ink-muted hover:bg-foreground/5 flex size-9 items-center justify-center rounded-xl"
        >
          <X className="size-[22px]" strokeWidth={3} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[18px] text-center">
        <div className="relative">
          <div className="bg-background relative h-[110px] w-40 -rotate-2 rounded-lg shadow-[inset_0_0_0_2px_var(--border)]">
            <div className="text-destructive/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[32px]">
              ⏰
            </div>
            <div className="border-destructive/50 absolute top-1/2 right-0 left-0 border-t-2 border-dashed" />
          </div>
          <div className="absolute -top-[30px] -right-4">
            <Eve size={90} mood="soft.concerned" />
          </div>
        </div>

        <div>
          <p className="font-heading text-destructive text-xs font-medium tracking-[1.5px] uppercase">
            Lien expiré
          </p>
          <h1 className="font-heading mt-1 text-[26px] leading-tight font-semibold">
            Oups, ce lien
            <br />
            n’est plus valable
          </h1>
          <p className="text-ink-soft mx-3 mt-3 text-sm leading-relaxed font-bold">
            Les liens magiques expirent après 15 minutes pour ta sécurité. Pas
            de souci, on en renvoie un tout de suite&nbsp;!
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Link
          to={entry}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          <RefreshCw className="size-[18px]" />
          Renvoyer un lien
        </Link>
        <Link
          to={entry}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'lg' }),
            'w-full',
          )}
        >
          Utiliser un autre email
        </Link>
      </div>
    </main>
  )
}
