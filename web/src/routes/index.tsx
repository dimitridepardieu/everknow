import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { Eve } from '@/components/eve'
import { buttonVariants } from '@/components/ui/button'
import { meQueryOptions } from '@/lib/auth'
import { cn } from '@/lib/utils'

import './landing.css'

export const Route = createFileRoute('/')({
  // A logged-in visitor gets sent into the app rather than the marketing page.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (me) {
      throw redirect({ to: me.role ? '/learn' : '/onboarding' })
    }
  },
  component: LandingPage,
})

// Eve asleep in a bubble of night, the Milky Way behind her — ported from the
// Claude Design board ("Hero nuit · 3 · La voie lactée"). The art is drawn in a
// fixed 540×430 box and scaled as a whole, so the coordinates below are the
// board's own pixels, untouched. The box and the scales live in landing.css.

// Three values and no blue: a blue night reads as a sticker sky. The stars
// take the mascot's pale violet rather than white.
const NIGHT_BUBBLE = '#241A5E'
const NIGHT_WAY = '#3A25A8'
const NIGHT_STAR = '#EFEBFF'

// A soft shape, never a circle and never a rounded rectangle. The star layer
// reuses these bounds so the field is clipped to the same silhouette, and
// .nb-blob morphs both in step.
const BUBBLE = { left: 60, top: 34, width: 420, height: 356 }

// Seeded, so the sky is one fixed drawing rather than a new one on every
// render. Returns [x, y, radius, twinkle delay] in stage pixels.
function starField(
  count: number,
  seed: number,
  [x, y, w, h]: readonly [number, number, number, number],
) {
  const out: [number, number, number, number][] = []
  let s = seed * 9301
  const next = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let i = 0; i < count; i++) {
    const a = next()
    const b = next()
    out.push([
      x + a * w,
      y + b * h,
      1.26 + ((i * 7) % 5) * 0.45,
      (i % 9) * 0.55,
    ])
  }
  return out
}

const STARS = starField(38, 11, [86, 74, 386, 290])

function NightHero() {
  return (
    <div className="nb-stage">
      <div className="nb-scaled">
        {/* The bubble, with the Milky Way blurred across it on the diagonal.
            The scarf is wider than the bubble and stops at its edge, which is
            what makes it read as passing behind rather than sitting inside. */}
        <div
          className="nb-blob absolute overflow-hidden"
          style={{ ...BUBBLE, background: NIGHT_BUBBLE, zIndex: 2 }}
        >
          <div
            className="absolute"
            style={{
              left: -70,
              top: 96,
              width: 560,
              height: 118,
              background: `linear-gradient(90deg, transparent, ${NIGHT_WAY}, transparent)`,
              transform: 'rotate(-19deg)',
              filter: 'blur(14px)',
              opacity: 0.9,
            }}
          />
        </div>

        {/* Stars are placed in stage coordinates but clipped to the bubble, so
            the field is shifted back to the stage origin inside the clip. */}
        <div
          className="nb-blob absolute overflow-hidden"
          style={{ ...BUBBLE, zIndex: 5 }}
        >
          <div
            className="nb-field"
            style={{ left: -BUBBLE.left, top: -BUBBLE.top }}
          >
            {STARS.map(([x, y, r, delay]) => (
              <span
                key={`${x}-${y}`}
                className="nb-star absolute rounded-full"
                style={{
                  left: x,
                  top: y,
                  width: r * 2,
                  height: r * 2,
                  background: NIGHT_STAR,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="absolute" style={{ left: 190, top: 154, zIndex: 7 }}>
          <Eve size={204} mood="soft.peaceful" />
        </div>
      </div>
    </div>
  )
}

// The brand mark — two passes over the same card, overlapping; the dense zone
// where they meet is what stays. Geometry from the Claude Design board ("le
// recoupement"): two r=27 discs, centres 24 apart. The viewBox is cropped to
// the ink rather than kept square, so `size` is the height actually rendered;
// the mark is 1.44× as wide as it is tall.
function LogoMark({ size = 30 }: { readonly size?: number }) {
  return (
    <svg
      width={(size * 78) / 54}
      height={size}
      viewBox="0 0 78 54"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="27" cy="27" r="27" opacity="0.65" />
      <circle cx="51" cy="27" r="27" opacity="0.65" />
    </svg>
  )
}

function LandingNav() {
  return (
    // The bar spans the viewport but its contents sit in the same max-w-5xl
    // column as the hero below, so the logo lines up with the illustration
    // instead of hugging the window edge on a wide screen.
    <nav className="h-16 shrink-0 px-5 lg:px-10">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-center lg:justify-start">
        {/* rounded-lg is invisible at rest — the link has no fill and no
            border. It is there for the focus outline, which traces the
            element's own radius, so this gives it the buttons' 16px corner. */}
        <Link
          to="/"
          className="text-primary flex cursor-pointer items-center gap-4 rounded-lg"
        >
          <LogoMark size={30} />
          <span className="font-heading text-[24px] font-semibold tracking-[-0.02em] lg:text-[26px]">
            Everknow
          </span>
        </Link>
      </div>
    </nav>
  )
}

function LandingPage() {
  return (
    // Column layout: the bar takes its height, the hero takes the rest. Nothing
    // in the hero can reach into the bar, however tall the illustration gets.
    <main className="bg-background flex min-h-dvh flex-col">
      <LandingNav />

      <section className="flex flex-1 flex-col px-5 pt-12 pb-6 lg:justify-center lg:px-10 lg:pt-2 lg:pb-14">
        {/* The layout has one breakpoint, lg, and every `lg:` below flips at it.
            The illustration has one of its own at md, in landing.css, because it
            reaches full size before there is room for two columns. No tablet
            layout in between: a middle design is a third one to keep working,
            and this page has too few elements to earn it.

            Mobile is a flex column, desktop a 5:6 grid — the words carry the
            promise and the buttons, so they get the wider track. The three
            pieces are siblings rather than an illustration plus a text column,
            because on a phone the buttons have to leave the pair: they stay on
            the bottom edge, within thumb reach, while the illustration and the
            promise centre in what is left. `lg:contents` dissolves the mobile
            wrapper so all three land in the grid, placed by hand. */}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col lg:grid lg:flex-none lg:grid-cols-[5fr_6fr] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-12">
          <div className="flex flex-1 flex-col items-center justify-center gap-10 lg:contents">
            {/* Illustration first — it leads on mobile and sits left on desktop,
                so the message lands after the eye has something to hold. One
                instance at both states: the stage scales itself in
                landing.css, and mounting a second copy would run the
                animations twice. */}
            <div className="flex items-center justify-center lg:row-span-2">
              <NightHero />
            </div>

            <h1 className="font-heading text-ink max-w-[460px] text-center text-[36px] leading-[1.2] font-semibold text-balance lg:col-start-2 lg:justify-self-center">
              La méthode calme et efficace pour retenir un cours{' '}
              <span className="text-primary relative whitespace-nowrap">
                longtemps
                <svg
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-2 w-full"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 Q 50 2 100 6 T 198 5"
                    stroke="var(--gold)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              &nbsp;!
            </h1>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-[340px] flex-col gap-3.5 lg:col-start-2 lg:mt-12 lg:justify-self-center">
            {/* Smaller and more widely spaced than the button primitive, which
                is tuned for buttons inside the app. These two are wider than
                any of those, and set in caps: at full width the default size
                reads shouty, and 0.3px of tracking is tight for caps. Height,
                radius and colour stay standard. */}
            <Link
              to="/register"
              className={cn(
                buttonVariants(),
                'w-full text-sm tracking-[0.8px]',
              )}
            >
              C’est parti !
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'secondary' }),
                'w-full text-sm tracking-[0.8px]',
              )}
            >
              J’ai déjà un compte
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
