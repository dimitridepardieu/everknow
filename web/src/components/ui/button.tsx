import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Everknow "chunky 3D" button: Fredoka, uppercase, and a hard offset shadow, so
// every default button feels tactile. The `link` variant opts out of the chunky
// treatment. Shadow colors come from --primary-dark / --secondary-dark so they
// track the theme (and dark mode) automatically.
//
// Pressing flattens the button onto the page: the drop goes to nothing and the
// button travels by exactly the relief it had, so its bottom edge never moves.
// That is why the travel is not the same everywhere — a coloured button's whole
// 5px is shadow, while `secondary` keeps a permanent 2px border and only has
// 3px to give. Change one of the two numbers in a variant and the other has to
// follow, or the button jumps under the finger.
//
// The press is deliberately not transitioned. box-shadow was never in the
// transition, so animating the transform alone made the button slide down while
// its shadow had already gone — a press that lagged the finger. A real key
// travels instantly; both halves now do.
//
// The focus ring is two layers, and it has to be. A single violet ring is
// invisible on the violet button — measured at 1.00:1, the colour against
// itself — which is what the old focus-visible:border-ring did. The white
// offset separates the ring from the button (5.05:1 on violet), the violet ring
// separates it from the page (4.75:1 on cream), so the indicator clears 3:1 on
// every surface a button sits on. It is opaque for the same reason: the ring it
// replaced was violet at 50%, which measured 2.09:1 against the page.
//
// The transparent 1px border reserves the space aria-invalid's border takes, so
// an invalid button never shifts the layout. The background deliberately paints
// under it (border-box, the default): clipping to the padding box instead let
// the page show through as a pale hairline between the face and its shadow,
// which broke the button into two pieces on a coloured surface.
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
