import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Everknow "chunky 3D" button: Fredoka, uppercase, and a hard
// offset shadow that compresses on press (translate-y + shrunk shadow), so
// every default button feels tactile. The `link` variant opts out of the
// chunky treatment. Shadow colors come from --primary-dark / --secondary-dark
// so they track the theme (and dark mode) automatically.
//
// The transparent 1px border is there to reserve the focus ring's space, so
// focusing a button never shifts the layout. The background deliberately paints
// under it (border-box, the default): clipping to the padding box instead let
// the page show through as a pale hairline between the face and its shadow,
// which broke the button into two pieces on a coloured surface.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-heading text-sm font-semibold tracking-[0.3px] whitespace-nowrap uppercase transition-transform outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-dark)] hover:bg-primary/95 active:shadow-[0_2px_0_var(--primary-dark)]',
        // Outline and drop take the same colour, so the button reads as one
        // raised slab rather than a face with a ring around it. It has to be a
        // real border and not an inset shadow: an inset sits inside the edge,
        // which leaves the background painting a hairline outside it.
        //
        // 3px of drop, not 5: this is the only variant with a visible border,
        // and at the bottom the border and the drop are the same colour, so
        // they read as one band. 2 + 3 matches the 5px the others show. Pressed
        // it drops the shadow entirely, because the 2px border alone is the
        // depth the others are left with.
        //
        // Hover is an opaque colour, never a bg-*/nn. The modifier replaces
        // bg-card rather than tinting it, so the page shows through the button
        // and every dose lands on the page's own cream — see --secondary-hover.
        secondary:
          'border-2 border-secondary-dark bg-card text-secondary-foreground shadow-[0_3px_0_var(--secondary-dark)] hover:bg-secondary-hover active:shadow-none',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive text-white shadow-[0_5px_0_var(--destructive-dark)] hover:bg-destructive/95 active:shadow-[0_2px_0_var(--destructive-dark)]',
        success:
          'bg-success text-white shadow-[0_5px_0_var(--success-dark)] hover:bg-success/95 active:shadow-[0_2px_0_var(--success-dark)]',
        link: 'font-sans tracking-normal normal-case text-primary underline-offset-4 hover:underline active:translate-y-0',
      },
      // No size carries its own radius any more: they all fall through to the
      // base's rounded-lg, so every button shows the same 16px corner whatever
      // its height. The scale used to climb to rounded-2xl (28.8px), which is
      // past half of a 48px button and therefore rendered as a pill.
      size: {
        default:
          'h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: "h-8 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-10 gap-1.5 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-14 gap-2 px-6 text-lg has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        icon: 'size-12',
        'icon-xs': "size-8 [&_svg:not([class*='size-'])]:size-4",
        'icon-sm': 'size-10',
        'icon-lg': 'size-14',
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
