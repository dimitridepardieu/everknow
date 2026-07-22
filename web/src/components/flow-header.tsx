import { ArrowLeft, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Top bar for the full-screen create/review flow. It spans the full width and
// hugs the viewport's left edge (px-6), so on desktop the control + title sit
// in the top-left corner instead of floating inside the centered content column
// below. `variant` picks the control: 'close' (×, exits the flow) or 'back'
// (←, steps back). Pass a title, or omit it for a bare control.
export function FlowHeader({
  variant,
  onActivate,
  title,
}: {
  readonly variant: 'close' | 'back'
  readonly onActivate: () => void
  readonly title?: string
}) {
  const Icon = variant === 'close' ? X : ArrowLeft
  return (
    <div className="flex items-center gap-3 px-6 pt-6">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onActivate}
        aria-label={variant === 'close' ? 'Fermer' : 'Retour'}
        className="text-ink-muted shrink-0"
      >
        <Icon className="size-[22px]" strokeWidth={3} />
      </Button>
      {title && <h1 className="font-heading text-lg font-semibold">{title}</h1>}
    </div>
  )
}
