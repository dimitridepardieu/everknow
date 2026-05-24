import type { CSSProperties } from 'react'

import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Wand2 } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'
import { buttonVariants } from '@/components/ui/button'
import { meQueryOptions } from '@/lib/auth'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (me) {
      throw redirect({ to: me.role ? '/learn' : '/onboarding' })
    }
  },
  component: SplashPage,
})

// Decorative sparkles scattered over the gradient (purely visual).
const SPARKLES: { style: CSSProperties; size: number }[] = [
  { style: { top: '12%', left: '14%' }, size: 18 },
  { style: { top: '20%', right: '18%' }, size: 14 },
  { style: { top: '50%', left: '8%' }, size: 22 },
  { style: { top: '54%', right: '10%' }, size: 16 },
  { style: { bottom: '32%', left: '20%' }, size: 12 },
]

function SplashPage() {
  return (
    // Gradient is full-bleed (immersive on desktop too); the content stays
    // in a centered phone-width column — the canonical responsive pattern
    // for auth screens.
    <main
      className="relative flex min-h-dvh flex-col items-center overflow-hidden text-white"
      style={{
        background:
          'linear-gradient(170deg, #FFC93C 0%, #FF8FB1 60%, #6B4EFF 130%)',
      }}
    >
      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          className="absolute text-white/55"
          style={s.style}
          size={s.size}
        />
      ))}

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col pt-[50px] pb-[34px]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-ink mb-1 flex items-center gap-2 rounded-full bg-white py-2 pr-3.5 pl-2 shadow-[0_4px_0_rgba(0,0,0,0.08)]">
            <span className="bg-primary flex size-8 items-center justify-center rounded-full">
              <Pip size={28} mood="happy" />
            </span>
            <span className="font-heading text-[15px] font-semibold">
              Flashcard Academy
            </span>
          </div>

          <Pip size={160} mood="cheer" />

          <div>
            <h1 className="font-heading text-[38px] leading-[1.05] font-semibold text-white [text-shadow:0_2px_0_rgba(0,0,0,0.06)]">
              Apprends en
              <br />
              t’amusant.
            </h1>
            <p className="mx-4 mt-2.5 text-[15px] leading-snug font-bold text-balance text-white/90">
              Tes cours deviennent des flashcards malines. Pip t’attend&nbsp;!
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-5">
          <Link
            to="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-ink hover:bg-ink/95 w-full text-white shadow-[0_6px_0_#000020] active:shadow-[0_2px_0_#000020]',
            )}
          >
            <Wand2 />
            Créer un compte
          </Link>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'w-full shadow-[0_6px_0_#0000001f] active:shadow-[0_2px_0_#0000001f]',
            )}
          >
            J’ai déjà un compte
          </Link>
        </div>
      </div>
    </main>
  )
}
