import { useState } from 'react'

import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowRight, ArrowUp, Check, X } from 'lucide-react'

import { CardSession } from '@/components/card-session'
import { Eve } from '@/components/eve'
import { Flashcard } from '@/components/flashcard'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useDueCards, useReviewCard } from '@/lib/cards'
import type { DueCard } from '@/lib/schemas'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/train')({
  component: TrainPage,
})

// The rungs of the ladder: a name and a placeholder emoji standing in for the
// per-rank icon we'll design later. The medal run (bronze → silver → gold)
// carries a progression a 6-year-old already reads, then gem and crown. The
// badge keeps one fixed shape across all ranks so a child's eye lands on it
// instantly — only the emoji inside changes. Mirrors the interval table in
// api/internal/card/schedule.go — a sixth rank there needs a sixth rung here.
// Whether a card is mastered comes from the API (a null due date), never from
// counting rungs.
const RANKS = [
  { name: 'Bronze', emoji: '🥉' },
  { name: 'Argent', emoji: '🥈' },
  { name: 'Or', emoji: '🥇' },
  { name: 'Diamant', emoji: '💎' },
  { name: 'Légende', emoji: '🏆' },
]

function TrainPage() {
  const { profile, isLoading } = useActiveProfile()
  const { data: cards, isPending, isFetching } = useDueCards(profile?.id)

  if (isLoading) return null
  if (!profile) return <Navigate to="/learn" />
  // Wait for the fetch to settle before starting: the session freezes whatever
  // list it sees at mount, so it must never freeze a stale cache still being
  // refetched. With focus/reconnect refetches off, isFetching only bites here,
  // on entry — never mid-session.
  if (isPending || isFetching || !cards) return null
  if (cards.length === 0) return <Navigate to="/learn" />

  return <Session cards={cards} />
}

// What answering one card produced. previousRank is what it was before, so the
// banner can show which way it moved; dueAt is null once the card is mastered.
interface Verdict {
  correct: boolean
  previousRank: number
  rank: number
  dueAt: string | null
}

function Session({ cards }: { readonly cards: readonly DueCard[] }) {
  const navigate = useNavigate()
  const review = useReviewCard()

  // Frozen at mount: the pile the child started with is the session. A refetch
  // (tab focus, say) must not pull cards out from under them mid-answer.
  const [deck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<
    'question' | 'revealed' | 'graded' | 'done'
  >('question')
  const [verdicts, setVerdicts] = useState<Verdict[]>([])

  const leave = () => void navigate({ to: '/learn' })

  if (phase === 'done') {
    return <DoneScreen verdicts={verdicts} onLeave={leave} />
  }

  const card = deck[index]
  const verdict = verdicts[index]

  const grade = (correct: boolean) => {
    review.mutate(
      { cardId: card.id, correct },
      {
        // A failed save is a request that went wrong, so it is announced and
        // leaves — an alert in the bottom row would push past the height the
        // frame reserves and move the card, which is what that reserve exists
        // to prevent.
        onError: () => {
          toast.add({
            type: 'error',
            title: 'Impossible d’enregistrer',
            description: 'Réessaie dans un instant.',
          })
        },
        onSuccess: (result) => {
          setVerdicts((prev) => [
            ...prev,
            {
              correct,
              previousRank: card.rank,
              rank: result.rank,
              dueAt: result.due_at,
            },
          ])
          setPhase('graded')
        },
      },
    )
  }

  const next = () => {
    if (index + 1 >= deck.length) {
      setPhase('done')
    } else {
      setIndex(index + 1)
      setPhase('question')
    }
  }

  const graded = phase === 'graded' && verdict !== undefined
  // The current card counts as done the moment it is answered, not when the
  // child taps Continuer — so the bar advances with the verdict, and Continuer
  // just reveals the next card under an already-filled step.
  const answered = index + (graded ? 1 : 0)

  return (
    <CardSession
      onClose={leave}
      progress={answered / deck.length}
      progressTone={graded && !verdict.correct ? 'destructive' : 'success'}
      status={`${String(index + 1)}/${String(deck.length)}`}
      bottomTone={graded ? verdictTone(verdict) : undefined}
      bottom={
        <>
          {phase === 'question' && (
            <Button
              onClick={() => {
                setPhase('revealed')
              }}
              className="w-full"
            >
              Réponse
            </Button>
          )}

          {phase === 'revealed' && (
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={review.isPending}
                onClick={() => {
                  grade(false)
                }}
                className="h-16 flex-1 rounded-[20px] px-2"
              >
                J’avais oublié
              </Button>
              <Button
                variant="success"
                disabled={review.isPending}
                onClick={() => {
                  grade(true)
                }}
                className="h-16 flex-1 rounded-[20px] px-2"
              >
                Je le savais
              </Button>
            </div>
          )}

          {graded && <ResultBanner verdict={verdict} onNext={next} />}
        </>
      }
    >
      <Flashcard
        question={card.question}
        answer={phase === 'question' ? undefined : card.answer}
        tone={graded && verdict.correct ? 'success' : 'neutral'}
      />
    </CardSession>
  )
}

// ─── Result banner ──────────────────────────────────────────

function nextDueLabel(dueAt: string): string {
  const days = Math.round(
    (new Date(dueAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  )
  if (days <= 1) return 'On la revoit demain'
  return `On la revoit dans ${String(days)} jours`
}

function verdictTone(verdict: Verdict): string {
  return verdict.correct ? 'bg-success-soft' : 'bg-destructive-soft'
}

function ResultBanner({
  verdict,
  onNext,
}: {
  readonly verdict: Verdict
  readonly onNext: () => void
}) {
  const { dueAt, correct } = verdict

  return (
    <>
      {/* The check or cross for an instant read; the rank badge and the next
          due date stacked beside it — where the card landed is the point. The
          row is a fixed 60px because the reserved height above counts on it. */}
      <div className="flex h-[60px] items-center gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white ${
            correct ? 'bg-success' : 'bg-destructive'
          }`}
        >
          {correct ? (
            <Check className="size-6" strokeWidth={3.5} />
          ) : (
            <X className="size-6" strokeWidth={3.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <RankBadge rank={verdict.rank} previousRank={verdict.previousRank} />
          <p className="text-ink-soft mt-1.5 text-xs font-bold">
            {dueAt === null
              ? 'Au sommet ! Elle ne reviendra plus.'
              : nextDueLabel(dueAt)}
          </p>
        </div>
      </div>
      <Button
        variant={correct ? 'success' : 'destructive'}
        onClick={onNext}
        className="mt-4 w-full"
      >
        Continuer
      </Button>
    </>
  )
}

function RankBadge({
  rank,
  previousRank,
}: {
  readonly rank: number
  readonly previousRank: number
}) {
  const rung = RANKS[rank - 1]
  // The arrow shows the move: up when the card climbed (the last step to
  // Légende is a climb too), down when it dropped, a red horizontal hold when a
  // Bronze card is forgotten and can drop no lower. A card already at Légende
  // shows no arrow at all — it is mastered, it does not move (a future "review
  // everything" mode could surface such a card, and its trophy says it all).
  const isTop = rank === RANKS.length
  const moved = rank - previousRank

  return (
    <span className="font-heading text-ink inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-base font-semibold shadow-[0_2px_0_var(--border)]">
      {moved > 0 ? (
        <ArrowUp className="text-success size-[18px]" strokeWidth={3} />
      ) : moved < 0 ? (
        <ArrowDown className="text-destructive size-[18px]" strokeWidth={3} />
      ) : isTop ? null : (
        <ArrowRight className="text-destructive size-[18px]" strokeWidth={3} />
      )}
      {rung.name}
      <span className="text-[15px] leading-none">{rung.emoji}</span>
    </span>
  )
}

// ─── End of session ─────────────────────────────────────────

function DoneScreen({
  verdicts,
  onLeave,
}: {
  readonly verdicts: readonly Verdict[]
  readonly onLeave: () => void
}) {
  const known = verdicts.filter((v) => v.correct).length
  const missed = verdicts.length - known

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[50px] pb-9 text-white"
      style={{
        background:
          'linear-gradient(180deg, var(--success) 0%, var(--success-dark) 100%)',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <Eve size={140} mood="soft.celebrate" />
        <div>
          <p className="font-heading text-xs font-medium tracking-[2px] text-white/80 uppercase">
            Entraînement terminé
          </p>
          <h1 className="font-heading mt-1.5 text-[30px] leading-tight font-semibold">
            Bien joué !
          </h1>
          <p className="mt-2 text-sm font-bold text-white/85">
            {missed === 0
              ? 'Tu as tout su du premier coup 🎯'
              : `On revoit bientôt ${missed === 1 ? 'la carte' : `les ${String(missed)} cartes`} que tu avais ${missed === 1 ? 'oubliée' : 'oubliées'} 🎯`}
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white/15 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap justify-center gap-1.5">
            {verdicts.map((v, i) => (
              <span
                key={i}
                className={`flex size-9 items-center justify-center rounded-lg ${
                  v.correct
                    ? 'text-success-dark bg-white/95'
                    : 'bg-white/20 text-white/70'
                }`}
              >
                {v.correct ? (
                  <Check className="size-4" strokeWidth={3.5} />
                ) : (
                  <X className="size-4" strokeWidth={3.5} />
                )}
              </span>
            ))}
          </div>
          <p className="font-heading mt-4 text-[26px] font-semibold">
            {known}
            <span className="text-lg opacity-60">/{verdicts.length}</span>
          </p>
          <p className="text-xs font-bold text-white/70">cartes sues</p>
        </div>
      </div>

      <Button
        variant="secondary"
        onClick={onLeave}
        className="w-full bg-white text-[var(--success-dark)]"
      >
        Terminé
      </Button>
    </main>
  )
}
