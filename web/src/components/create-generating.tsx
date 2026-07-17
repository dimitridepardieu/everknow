import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'

// The waiting screen while the AI generates. One blocking call, so there is
// no real progress to show — the design's four checklist steps would tick on
// a timer and lie. Pip thinks, the halo breathes, and that's honest (#38).
const SPARKLES = [
  { size: 18, className: 'top-[15%] left-[12%]' },
  { size: 14, className: 'top-[24%] right-[16%]' },
  { size: 20, className: 'bottom-[30%] left-[10%]' },
  { size: 12, className: 'bottom-[26%] right-[14%]' },
  { size: 10, className: 'top-[40%] left-[22%]' },
]

export function CreateGenerating() {
  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
      style={{
        background:
          'linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)',
      }}
    >
      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          size={s.size}
          className={`absolute animate-pulse ${s.className}`}
          style={{ color: '#FFC93C', animationDelay: `${i * 0.4}s` }}
        />
      ))}

      <div className="relative mb-6">
        <div className="absolute -inset-4 animate-pulse rounded-full bg-white/15" />
        <div className="relative">
          <Pip size={150} mood="think" />
        </div>
      </div>

      <p className="font-heading text-sm font-medium tracking-[2px] text-white/70 uppercase">
        Génération en cours
      </p>
      <h1 className="font-heading mt-1.5 text-[32px] leading-tight font-semibold">
        Pip réfléchit…
      </h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed font-bold text-white/75">
        Je lis ton texte et je fabrique tes flashcards 🪄
      </p>
    </main>
  )
}
