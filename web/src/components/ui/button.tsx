import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Flashcard Academy "chunky 3D" button: Fredoka, uppercase, and a hard
// offset shadow that compresses on press (translate-y + shrunk shadow), so
// every default button feels tactile. The `link` variant opts out of the
// chunky treatment. Shadow colors come from --primary-dark / --border so
// they track the theme (and dark mode) automatically.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-heading text-sm font-semibold tracking-[0.3px] whitespace-nowrap uppercase transition-transform outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-dark)] hover:bg-primary/95 active:shadow-[0_2px_0_var(--primary-dark)]',
        secondary:
          'bg-card text-secondary-foreground shadow-[inset_0_0_0_2px_var(--border),0_5px_0_var(--border)] active:shadow-[inset_0_0_0_2px_var(--border),0_2px_0_var(--border)]',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive text-white shadow-[0_5px_0_color-mix(in_oklab,var(--destructive),black_22%)] hover:bg-destructive/95 active:shadow-[0_2px_0_color-mix(in_oklab,var(--destructive),black_22%)]',
        link: 'font-sans tracking-normal normal-case text-primary underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        default:
          'h-12 gap-2 rounded-2xl px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: "h-8 gap-1 rounded-lg px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-10 gap-1.5 rounded-xl px-4 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-14 gap-2 rounded-2xl px-6 text-lg has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        icon: 'size-12 rounded-2xl',
        'icon-xs':
          "size-8 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-4",
        'icon-sm': 'size-10 rounded-xl in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-14 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
