import type { ComponentProps } from 'react'

import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

// Dismiss affordance for fullscreen-modal-style screens. Takes any Link props
// (usually just `to`); position and colour come from className so it can sit
// on a gradient (white ×) or a light background (default ink ×).
export function CloseButton({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      aria-label="Fermer"
      className={cn(
        'text-ink-muted hover:bg-foreground/5 flex size-9 items-center justify-center rounded-full transition-colors',
        className,
      )}
      {...props}
    >
      <X className="size-[22px]" strokeWidth={3} />
    </Link>
  )
}
