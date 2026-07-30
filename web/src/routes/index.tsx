import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'
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

// The orbit's fixed palette (colour + its 3D-shadow dark). Decorative, not
// theme tokens — a card keeps its subject's colour regardless of theme.
//
// Every card sits at the same distance from Pip — they ride the ring. Only the
// angles are uneven, and they have to be: a card is 116px wide but 68px tall,
// so two cards side by side need nearly twice the gap of two stacked ones. An
// even 72° step spends the same arc on both and leaves the sideways pairs
// cramped. The steps below widen where cards meet flank to flank (Maths→
// Anglais, Histoire→Sciences) and tighten where one sits above the other
// (Anglais→Histoire, on the left).
const ORBIT_CARDS = [
  {
    ang: 0,
    color: '#6B4EFF',
    dark: '#4D33CC',
    cat: 'Géo',
    q: 'Capitale ?',
    a: 'Rome',
  },
  {
    ang: 80,
    color: '#FFC93C',
    dark: '#D9A41A',
    cat: 'Maths',
    q: '8 × 7 ?',
    a: '56',
  },
  {
    ang: 155,
    color: '#2EC4B6',
    dark: '#1E9085',
    cat: 'Anglais',
    q: 'Cat ?',
    a: 'Chat',
  },
  {
    ang: 205,
    color: '#F0564B',
    dark: '#CC3D33',
    cat: 'Histoire',
    q: '1789 ?',
    a: 'Révolution',
  },
  {
    ang: 290,
    color: '#4FC1F0',
    dark: '#2A9DC9',
    cat: 'Sciences',
    q: 'H₂O ?',
    a: 'Eau',
  },
] as const

const ORBIT_SPARKLES = [
  { left: '12%', top: '14%', size: 18, color: '#FFC93C' },
  { left: '85%', top: '20%', size: 14, color: '#FF8FB1' },
  { left: '8%', top: '78%', size: 12, color: '#2EC4B6' },
  { left: '88%', top: '72%', size: 16, color: '#6B4EFF' },
] as const

// Half of a rendered card, shadow included, measured on the widest one
// ("Histoire → Révolution"): min-w-[88px] stretched by its content, plus
// px-2.5/py-2 and the inset border below.
//
// The cards are absolutely positioned, so the stage can't learn its own size
// from them — it has to reserve their reach up front, or they spill over
// whatever sits above (that is how they ended up drawn across the top bar).
// Re-measure these two if a card's padding, type sizes, or longest answer
// change: nothing fails loudly when they drift.
const CARD_HALF_W = 58
const CARD_HALF_H = 34

function OrbitHero({
  size = 260,
  pipSize = 120,
}: {
  readonly size?: number
  readonly pipSize?: number
}) {
  const reach = size / 2

  return (
    <div
      className="lp-orbit-stage"
      style={{
        width: 2 * (reach + CARD_HALF_W),
        height: 2 * (reach + CARD_HALF_H),
      }}
    >
      <div className="lp-orbit-glow" style={{ width: size, height: size }} />

      <svg
        width={size + 20}
        height={size + 20}
        className="absolute opacity-30"
        aria-hidden="true"
      >
        <circle
          cx={(size + 20) / 2}
          cy={(size + 20) / 2}
          r={size / 2}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeDasharray="3 8"
        />
      </svg>

      {ORBIT_SPARKLES.map((s) => (
        <Sparkle
          key={`${s.left}-${s.top}`}
          size={s.size}
          className="absolute"
          style={{ left: s.left, top: s.top, color: s.color }}
        />
      ))}

      <div className="relative z-[2]">
        <Pip size={pipSize} mood="cheer" />
      </div>

      <div
        className="lp-orbit-ring"
        style={{ '--ring-size': `${size}px` } as React.CSSProperties}
      >
        {ORBIT_CARDS.map((c) => (
          <div
            key={c.cat}
            className="lp-orbit-card"
            style={{ '--ang': `${c.ang}deg` } as React.CSSProperties}
          >
            <div className="lp-orbit-card-body">
              <div
                className="min-w-[88px] rounded-[14px] bg-white px-2.5 py-2"
                style={{
                  boxShadow: `0 4px 0 ${c.dark}, 0 0 0 2.5px ${c.color} inset`,
                }}
              >
                <p
                  className="font-heading text-[9px] font-semibold tracking-[1px] uppercase"
                  style={{ color: c.color }}
                >
                  {c.cat}
                </p>
                <p className="text-ink font-heading mt-px text-[13px] font-semibold whitespace-nowrap">
                  {c.q}
                </p>
                <p
                  className="mt-0.5 text-[11px] font-bold whitespace-nowrap"
                  style={{ color: c.color }}
                >
                  → {c.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// The brand mark — two passes over the same card, overlapping; the dense zone
// where they meet is the memory. Ported 1:1 from the Claude Design board
// ("le recoupement"), padded viewBox included: the ink is only 78×54 inside the
// 100 box, so the mark reads noticeably smaller than `size` says.
function LogoMark({ size = 28 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="38" cy="50" r="27" opacity="0.65" />
      <circle cx="62" cy="50" r="27" opacity="0.65" />
    </svg>
  )
}

function LandingNav() {
  return (
    <nav className="flex h-16 shrink-0 items-center justify-center px-5 md:justify-start md:px-10">
      <div className="text-primary flex items-center gap-2.5">
        <LogoMark size={56} />
        <span className="font-heading text-[24px] font-semibold tracking-[-0.02em] md:text-[26px]">
          Everknow
        </span>
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
              so the message lands after the eye has something to hold.

              Two sizes, 155 below xl and 220 above. Both are mounted; only one
              is shown, the other is display:none.

              The ring has a ceiling: a card reaches ring/2 + CARD_HALF_W
              sideways, so past ~225 it clips a 375px viewport. How far apart
              the cards sit is set by the angles in ORBIT_CARDS, not here. */}
          <div className="flex items-center justify-center">
            <div className="xl:hidden">
              <OrbitHero size={155} pipSize={98} />
            </div>
            <div className="hidden xl:block">
              <OrbitHero size={220} pipSize={175} />
            </div>
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
