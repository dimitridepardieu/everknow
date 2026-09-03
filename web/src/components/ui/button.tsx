import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Everknow "chunky 3D" button: Fredoka, uppercase, and a hard offset shadow, so
// every default button feels tactile. The `link` variant opts out of it.
//
// Three couplings the code cannot state on its own:
//
// - A variant's press travel must equal its resting relief, or the bottom edge
//   moves and the button jumps under the finger. Coloured variants are 5px of
//   shadow and travel 5; `secondary` is a 2px border plus 3px of shadow and
//   travels 3, because a border does not compress. Change one number and the
//   other has to follow.
// - The focus ring needs both its layers. A ring in one colour is invisible on
//   a button of that colour — 1.00:1 — so the white offset carries it over the
//   button (5.05:1) and the ring carries it over the page (4.75:1).
// - The transparent 1px border is not decoration: it reserves the space
//   aria-invalid's border takes, so an invalid button does not shift the
//   layout. The background must keep painting under it (border-box), or the
//   page shows through as a hairline splitting the face from its shadow.
// - Disabled drops the relief and overrides the base's opacity rather than
//   inheriting it. Fading a raised violet button leaves a raised violet
//   button, and the relief is the thing that says "press me".
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-heading text-sm font-semibold tracking-[0.3px] whitespace-nowrap uppercase outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white active:not-aria-[haspopup]:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-dark)] hover:bg-primary/95 active:shadow-none active:not-aria-[haspopup]:translate-y-[5px]',
        // Outline and drop take the same colour, so the button reads as one
        // raised slab rather than a face with a ring around it. It has to be a
        // real border and not an inset shadow: an inset sits inside the edge,
        // which leaves the background painting a hairline outside it.
        //
        // 3px of drop, not 5: this is the only variant with a visible border,
        // and at the bottom the border and the drop are the same colour, so
        // they read as one band. 2 + 3 matches the 5px the others show, and it
        // travels 3 rather than 5 because the border is not compressible.
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
          'bg-destructive text-white shadow-[0_5px_0_var(--destructive-dark)] hover:bg-destructive/95 active:shadow-none active:not-aria-[haspopup]:translate-y-[5px]',
        success:
          'bg-success text-white shadow-[0_5px_0_var(--success-dark)] hover:bg-success/95 active:shadow-none active:not-aria-[haspopup]:translate-y-[5px]',
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
    compoundVariants: [
      {
        variant: ['default', 'secondary', 'destructive', 'success'],
        class:
          'disabled:border-transparent disabled:bg-[#e6e2d6] disabled:text-ink-muted disabled:opacity-100 disabled:shadow-none',
      },
    ],
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
