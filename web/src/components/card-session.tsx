import type * as React from 'react'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Going through a pile of cards one at a time, whether training on them or
// deciding which ones to keep. Three fixed rows: top bar, scene, bottom bar.
//
// The scene keeps its height whatever the bottom row holds, so the card a
// reader is looking at never moves under them. That is the whole point of the
// reserved height below — and of putting both screens on the same frame, since
// reviewing a fresh batch is the first pass over cards they will train on next.
export function CardSession({
  onClose,
  progress,
  progressTone = 'success',
  status,
  bottomTone,
  bottom,
  children,
}: {
  readonly onClose: () => void
  // How far through the pile, 0 to 1.
  readonly progress: number
  readonly progressTone?: 'success' | 'destructive'
  // The top-right corner: where you are in the pile, or what you have decided.
  readonly status: React.ReactNode
  // Paints the whole bottom row — a verdict tints it, a plain question does not.
  readonly bottomTone?: string
  readonly bottom: React.ReactNode
  readonly children: React.ReactNode
}) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      {/* Close and the progress bar share the top row, like the design. The
          close keeps its original muted style and viewport-left position. */}
      <div className="flex items-center gap-3 px-6 pt-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fermer"
          className="text-ink-muted shrink-0"
        >
          <X className="size-[22px]" strokeWidth={3} />
        </Button>
        {/* Thicker bar with a glossy highlight (the design's ::after strip).
            Centred and capped (max-w-4xl) so it stops short of the edges on
            desktop, Duolingo-style, rather than stretching the full width. */}
        <div className="flex-1">
          <div className="mx-auto h-3.5 max-w-4xl overflow-hidden rounded-full bg-[#e6e2d6] shadow-[inset_0_2px_0_rgba(0,0,0,0.05)]">
            <div
              className={cn(
                'relative h-full rounded-full transition-[width,background-color] duration-300',
                progressTone === 'destructive'
                  ? 'bg-destructive'
                  : 'bg-success',
              )}
              style={{ width: `${String(progress * 100)}%` }}
            >
              <div className="absolute inset-x-1.5 top-0.5 h-1 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
        {/* Real info instead of a blank, and it balances the close button on
            the left (Duolingo puts hearts here). */}
        <div className="font-heading text-ink-muted shrink-0 pl-2 text-sm font-semibold tabular-nums">
          {status}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md items-center justify-center px-5 py-4">
        {children}
      </div>

      {/* 184px = pt-6 + a 60px row + pt-4 + a 48px button + pb-9, the tallest
          the bottom row ever gets; change any of those and this has to follow.
          Content is pinned to the bottom, so the main action sits under the
          same thumb whatever it says. */}
      <div className={bottomTone}>
        <div className="mx-auto flex min-h-[184px] w-full max-w-md flex-col justify-end px-5 pt-6 pb-9">
          {bottom}
        </div>
      </div>
    </main>
  )
}
