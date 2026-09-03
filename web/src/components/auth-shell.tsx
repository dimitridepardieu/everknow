import type * as React from 'react'

import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  // The control in the top-right corner, opposite the close button — the
  // switch to the other door on the form, nothing on the sent screen.
  readonly action?: React.ReactNode
  // A band pinned to the foot of the page, outside the centred column.
  readonly bottom?: React.ReactNode
  // Turns the column into a form. Auth forms carry type="email" for the
  // mobile keyboard, whose native check would intercept the submit with a
  // browser bubble for some addresses and let others (d@d) through to Zod.
  readonly onSubmit?: React.FormEventHandler<HTMLFormElement>
  readonly children: React.ReactNode
}

// The frame every auth screen shares: a close button back to the landing, and
// a 380px column centred in what remains. Its children are stacked 22px apart.
export function AuthShell({
  action,
  bottom,
  onSubmit,
  children,
}: AuthShellProps) {
  const column = 'flex w-full max-w-[380px] flex-col gap-[22px]'

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
        {action}
      </header>

      <div
        className={cn(
          'flex flex-1 items-center justify-center px-5 sm:px-6',
          !bottom && 'pb-8 sm:pb-10',
        )}
      >
        {onSubmit ? (
          <form noValidate onSubmit={onSubmit} className={column}>
            {children}
          </form>
        ) : (
          <div className={column}>{children}</div>
        )}
      </div>

      {bottom}
    </main>
  )
}
