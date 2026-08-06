import * as React from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// The inline counterpart of the toast: same state colours, no relief. A toast
// floats above the page and leaves; an alert belongs to the form it sits in,
// so it is a tinted surface with a ring rather than a raised card.
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg px-[15px] py-[13px] text-left text-sm inset-ring-2 has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-[11px] *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:
          'bg-primary-soft text-primary-dark inset-ring-primary/30 *:data-[slot=alert-description]:text-ink-soft',
        destructive:
          'bg-destructive-soft text-destructive-dark inset-ring-destructive/35 *:data-[slot=alert-description]:text-ink-soft',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-heading [&_a]:hover:text-foreground text-[15px] font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-ink-soft [&_a]:hover:text-foreground text-[13px] leading-[1.45] font-bold text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute top-2 right-2', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
