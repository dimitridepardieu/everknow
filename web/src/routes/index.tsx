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

// The night art is drawn in a fixed 540×430 box and scaled as a whole, so the
// coordinates below are the Claude Design board's own pixels, untouched
// ("Hero nuit · 3 · La voie lactée"). The box itself lives in landing.css,
// which owns the two scales.

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
    <nav className="h-16 shrink-0 px-5 md:px-10">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-center md:justify-start">
        <Link
          to="/"
          className="text-primary flex cursor-pointer items-center gap-4"
        >
          <LogoMark size={30} />
          <span className="font-heading text-[24px] font-semibold tracking-[-0.02em] md:text-[26px]">
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

      <section className="flex flex-1 flex-col px-5 pt-12 pb-10 md:justify-center md:px-10 md:pt-2 md:pb-14">
        {/* Mobile stacks into two rows and fills the remaining height so the
            CTAs can sit at the bottom edge; desktop drops back to two centred
            columns where that anchoring would leave a hole. */}
        <div className="mx-auto grid w-full max-w-5xl flex-1 grid-rows-[auto_1fr] items-stretch gap-6 md:flex-none md:grid-cols-2 md:grid-rows-none md:items-center md:gap-12">
          {/* Illustration first — it leads on mobile and sits left on desktop,
              so the message lands after the eye has something to hold. One
              instance at both widths: the stage scales itself in landing.css,
              and mounting a second copy would run the animations twice. */}
          <div className="flex items-center justify-center">
            <NightHero />
          </div>

          {/* Text column — centred at every width, mirroring the illustration
              across the grid instead of pulling the eye to one side. */}
          <div className="flex flex-col items-center text-center">
            <h1 className="font-heading text-ink max-w-[460px] text-[36px] leading-[1.2] font-semibold text-balance">
              La méthode rapide, fun et efficace pour{' '}
              <span className="text-primary relative whitespace-nowrap">
                mémoriser
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
              </span>{' '}
              tes cours&nbsp;!
            </h1>

            <div className="mt-auto flex w-full max-w-[300px] flex-col gap-3.5 pt-8 md:mt-12 md:pt-0">
              <Link
                to="/register"
                className={cn(
                  buttonVariants(),
                  'w-full shadow-[0_5px_0_var(--primary-dark)] active:shadow-[0_2px_0_var(--primary-dark)]',
                )}
              >
                C’est parti !
              </Link>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'w-full',
                )}
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
