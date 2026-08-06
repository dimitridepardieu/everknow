import * as React from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import {
  CheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const toast = ToastPrimitive.createToastManager()

// A state colours exactly two things — the ring around the card and the icon
// chip — so five kinds of toast still read as one family. Everything else
// (white card, hard shadow, Fredoka title) is shared.
const STATE_STYLES = {
  success: {
    ring: 'inset-ring-success/35',
    chip: 'bg-success-soft text-success-dark',
    bar: 'bg-success',
  },
  info: {
    ring: 'inset-ring-sky/35',
    chip: 'bg-sky-soft text-sky-dark',
    bar: 'bg-sky',
  },
  warning: {
    ring: 'inset-ring-gold/40',
    chip: 'bg-gold-soft text-gold-dark',
    bar: 'bg-gold',
  },
  error: {
    ring: 'inset-ring-destructive/40',
    chip: 'bg-destructive-soft text-destructive-dark',
    bar: 'bg-destructive',
  },
  loading: {
    ring: 'inset-ring-primary/30',
    chip: 'bg-primary-soft text-primary-dark',
    bar: 'bg-primary',
  },
} as const

function stateStyle(type: string | undefined) {
  return STATE_STYLES[type as keyof typeof STATE_STYLES] ?? STATE_STYLES.loading
}

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        'pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full',
        className,
      )}
      {...props}
    />
  )
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        'group/toast bg-card text-card-foreground focus-visible:ring-ring/50 pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom overflow-hidden rounded-[20px] shadow-[0_4px_0_var(--border)] inset-ring-2 will-change-transform outline-none select-none focus-visible:ring-[3px]',
        '[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]',
        'h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]',
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        'data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
        'data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]',
        '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
        'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
        'data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        'data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
        'data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
        'data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        className,
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        'flex h-full items-center gap-3 overflow-hidden p-3.5 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100',
        className,
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        'font-heading text-ink text-base leading-[1.2] font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        'text-ink-soft text-[13.5px] leading-[1.4] font-bold text-pretty',
        className,
      )}
      {...props}
    />
  )
}

function ToastAction({
  className,
  render = <Button variant="secondary" size="sm" className="text-primary" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Fermer"
      render={render}
      className={cn(
        "text-ink-muted hover:text-ink-soft relative shrink-0 rounded-[10px] after:absolute after:-inset-2 after:content-['']",
        className,
      )}
      {...props}
    >
      {children ?? (
        <XIcon className="size-[17px]" strokeWidth={3} aria-hidden="true" />
      )}
    </ToastPrimitive.Close>
  )
}

// The glyph sits bare inside a coloured chip rather than carrying its own
// circle, so the chip is the only round thing and the stroke can be heavy
// enough to read at a glance.
function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null

  if (type === 'success') {
    icon = <CheckIcon strokeWidth={3.2} aria-hidden="true" />
  }

  if (type === 'info') {
    icon = <InfoIcon strokeWidth={2.6} aria-hidden="true" />
  }

  if (type === 'warning') {
    icon = <TriangleAlertIcon strokeWidth={2.6} aria-hidden="true" />
  }

  if (type === 'error') {
    icon = <XIcon strokeWidth={3.2} aria-hidden="true" />
  }

  if (type === 'loading') {
    icon = <Loader2Icon className="animate-spin" aria-hidden="true" />
  }

  if (!icon) {
    return null
  }

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[13px] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[22px]",
        stateStyle(type).chip,
      )}
    >
      {icon}
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => (
    <Toast
      key={toastItem.id}
      toast={toastItem}
      className={stateStyle(toastItem.type).ring}
    >
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ToastAction />
          <ToastClose />
        </div>
      </ToastContent>
      {/* A loading toast has no deadline to draw down. */}
      {toastItem.type !== 'loading' && (
        <span
          aria-hidden
          className={cn(
            'animate-toast-timer absolute bottom-0 left-0 h-1 opacity-85 group-data-expanded/toast:[animation-play-state:paused]',
            stateStyle(toastItem.type).bar,
          )}
        />
      )}
    </Toast>
  ))
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
