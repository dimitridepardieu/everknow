import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Wand2 } from 'lucide-react'

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
    ang: 72,
    color: '#FFC93C',
    dark: '#D9A41A',
    cat: 'Maths',
    q: '8 × 7 ?',
    a: '56',
  },
  {
    ang: 144,
    color: '#2EC4B6',
    dark: '#1E9085',
    cat: 'Anglais',
    q: 'Cat ?',
    a: 'Chat',
  },
  {
    ang: 216,
    color: '#F0564B',
    dark: '#CC3D33',
    cat: 'Histoire',
    q: '1789 ?',
    a: 'Révolution',
  },
  {
    ang: 288,
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

function OrbitHero({
  size = 260,
  pipSize = 120,
}: {
  readonly size?: number
  readonly pipSize?: number
}) {
  return (
    <div
      className="lp-orbit-stage"
      style={{ width: size + 80, height: size + 80 }}
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
        style={
          {
            '--ring-size': `${size}px`,
            '--ring-dur': '22s',
          } as React.CSSProperties
        }
      >
        {ORBIT_CARDS.map((c, i) => (
          <div
            key={c.cat}
            className="lp-orbit-card"
            style={{ '--ang': `${c.ang}deg` } as React.CSSProperties}
          >
            <div className="lp-orbit-card-body">
              <div
                className="lp-float min-w-[88px] rounded-[14px] bg-white px-2.5 py-2"
                style={{
                  boxShadow: `0 4px 0 ${c.dark}, 0 0 0 2.5px ${c.color} inset`,
                  animationDelay: `${i * 0.4}s`,
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

function LandingNav() {
  return (
    <nav className="border-border bg-background/85 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3.5 backdrop-blur-md md:px-10 md:py-4">
      <div className="flex items-center gap-2">
        <span className="bg-primary flex size-9 items-center justify-center rounded-[10px] shadow-[0_3px_0_var(--primary-dark)]">
          <Pip size={32} mood="happy" />
        </span>
        <span className="font-heading text-ink text-[17px] font-semibold md:text-xl">
          Flashcard Academy
        </span>
      </div>
      <Link
        to="/welcome"
        className={cn(buttonVariants({ size: 'sm' }), 'rounded-xl')}
      >
        C’est parti !
      </Link>
    </nav>
  )
}

function LandingPage() {
  return (
    <main className="bg-background min-h-dvh">
      <LandingNav />

      <section className="lp-bg-grid relative px-5 pt-9 pb-14 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <span className="text-primary font-heading mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-[0_2px_0_var(--border)]">
            <Sparkle size={14} className="text-primary" />
            Nouveau · IA pour les enfants
          </span>

          <h1 className="font-heading text-ink text-[36px] leading-[1.05] font-semibold text-balance md:text-[52px]">
            Transforme tes cours en{' '}
            <span className="text-primary relative whitespace-nowrap">
              flashcards
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
            en 10 secondes.
          </h1>

          <p className="text-ink-soft mx-4 mt-3.5 text-[15px] leading-relaxed font-semibold text-pretty md:text-lg">
            Pip transforme tes cours en flashcards malines. Réviser devient un
            jeu — et tes parents adorent.
          </p>

          <Link
            to="/welcome"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-6 shadow-[0_6px_0_var(--primary-dark)] active:shadow-[0_2px_0_var(--primary-dark)]',
            )}
          >
            <Wand2 />
            C’est parti !
          </Link>

          <div className="mt-6 flex justify-center">
            <OrbitHero />
          </div>
        </div>
      </section>

      <footer className="bg-ink px-5 py-9 text-white">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2.5">
            <Pip size={40} mood="happy" />
            <span className="font-heading text-lg font-semibold">
              Flashcard Academy
            </span>
          </div>
          <p className="text-[13px] font-semibold text-white/65">
            Les flashcards malines, pour les enfants curieux.
          </p>
          <p className="mt-3 text-[11px] font-semibold text-white/45">
            © 2026 Flashcard Academy
          </p>
        </div>
      </footer>
    </main>
  )
}
