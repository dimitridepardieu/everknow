import { useEffect, useState } from 'react'

import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Eye, X } from 'lucide-react'

import { FlowHeader } from '@/components/flow-header'
import { Pip } from '@/components/pip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useDueCards, useReviewCard } from '@/lib/cards'
import type { DueCard } from '@/lib/schemas'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/train')({
  component: TrainPage,
})

// How many ranks the ladder has, and the colour of each. Mirrors the interval
// table in api/internal/card/schedule.go — a sixth rank there needs a sixth
// colour here. Whether a card is mastered comes from the API (a null due date),
// never from comparing against this number.
const RANK_COUNT = 5
const RANK_COLORS = ['#ff5e5e', '#ff7a1a', '#ffc93c', '#7ad9c8', '#2ec4b6']

// The beat between answering and the next card. Long enough to read the rank
// moving, short enough that ten cards don't feel like a queue.
const FEEDBACK_MS = 1500

function TrainPage() {
  const { profile, isLoading } = useActiveProfile()
  const { data: cards, isPending } = useDueCards(profile?.id)

  if (isLoading) return null
  if (!profile) return <Navigate to="/learn" />
  if (isPending || !cards) return null
  if (cards.length === 0) return <Navigate to="/learn" />

  return <Session cards={cards} />
}

// What answering one card produced.
interface Verdict {
  correct: boolean
  rank: number
  mastered: boolean
}

function Session({ cards }: { readonly cards: readonly DueCard[] }) {
  const navigate = useNavigate()
  const review = useReviewCard()

  // Frozen at mount: the pile the child started with is the session. A refetch
  // (tab focus, say) must not pull cards out from under them mid-answer.
  const [deck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<
    'question' | 'revealed' | 'feedback' | 'done'
  >('question')
  const [verdicts, setVerdicts] = useState<Verdict[]>([])

  // Syncing with a timer — the one thing effects are for. Cleanup matters: the
  // child can close the session mid-beat.
  useEffect(() => {
    if (phase !== 'feedback') return
    const timer = setTimeout(() => {
      if (index + 1 >= deck.length) {
        setPhase('done')
      } else {
        setIndex(index + 1)
        setPhase('question')
      }
    }, FEEDBACK_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [phase, index, deck.length])

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
        onSuccess: (result) => {
          setVerdicts((prev) => [
            ...prev,
            { correct, rank: result.rank, mastered: result.due_at === null },
          ])
          setPhase('feedback')
        },
      },
    )
  }

  return (
    <main className="flex min-h-dvh flex-col pb-9">
      <FlowHeader variant="close" onActivate={leave} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <div className="mt-2 flex items-center justify-between">
          <p className="font-heading text-ink-muted text-xs font-semibold tracking-[1px] uppercase">
            Carte {index + 1} sur {deck.length}
          </p>
          <span className="font-heading text-ink-muted text-xs font-semibold">
            {verdicts.filter((v) => v.correct).length} ✓
          </span>
        </div>
        <div className="bg-primary-soft mt-2 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${String((index / deck.length) * 100)}%` }}
          />
        </div>

        {phase === 'feedback' && verdict ? (
          <Feedback verdict={verdict} />
        ) : (
          <>
            <div className="mt-6 flex flex-1 items-center">
              <div className="relative w-full">
                {/* stacked cards behind, for depth (decorative). inset-0 makes
                    them match the card's own height, so the rotation is what
                    peeks out — a fixed height would hide them under it. */}
                <div className="absolute inset-0 rotate-[-2.5deg] rounded-3xl bg-white opacity-55 shadow-[0_3px_0_var(--border)]" />
                <div className="absolute inset-0 rotate-[1.8deg] rounded-3xl bg-white opacity-80 shadow-[0_3px_0_var(--border)]" />

                <div className="relative rounded-3xl bg-white p-6 shadow-[0_4px_0_var(--border),inset_0_0_0_2px_var(--primary-soft)]">
                  <p className="font-heading text-ink-muted mb-2 text-xs font-semibold tracking-[1px] uppercase">
                    Question
                  </p>
                  <p className="font-heading text-ink text-[24px] leading-snug font-semibold">
                    {card.question}
                  </p>

                  {phase === 'revealed' && (
                    <>
                      <div className="my-5 border-t-2 border-dashed border-[var(--border)]" />
                      <p className="font-heading text-primary mb-2 text-xs font-semibold tracking-[1px] uppercase">
                        Réponse
                      </p>
                      <p className="text-ink text-[19px] leading-relaxed font-bold">
                        {card.answer}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {review.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  Impossible d’enregistrer. Réessaie dans un instant.
                </AlertDescription>
              </Alert>
            )}

            {phase === 'question' ? (
              <>
                <p className="text-ink-muted mt-5 text-center text-sm font-bold">
                  Réfléchis bien avant de révéler 🤔
                </p>
                <Button
                  onClick={() => {
                    setPhase('revealed')
                  }}
                  className="mt-3 w-full"
                >
                  <Eye className="size-5" strokeWidth={2.5} />
                  Révéler la réponse
                </Button>
              </>
            ) : (
              <>
                <div className="mt-5 flex flex-col items-center gap-1">
                  <Pip size={70} mood="happy" />
                  <p className="font-heading text-ink text-lg font-semibold">
                    Tu connaissais ?
                  </p>
                </div>
                <div className="mt-3 flex gap-3">
                  <Button
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() => {
                      grade(false)
                    }}
                    className="h-16 flex-1 rounded-[20px] shadow-[0_5px_0_#c9453f] active:shadow-[0_2px_0_#c9453f]"
                  >
                    <X className="size-6" strokeWidth={3.5} />
                    Pas su
                  </Button>
                  <Button
                    disabled={review.isPending}
                    onClick={() => {
                      grade(true)
                    }}
                    className="h-16 flex-1 rounded-[20px] bg-[var(--success)] shadow-[0_5px_0_var(--success-dark)] active:shadow-[0_2px_0_var(--success-dark)]"
                  >
                    <Check className="size-6" strokeWidth={4} />
                    Su !
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

// ─── Feedback beat ──────────────────────────────────────────

function Feedback({ verdict }: { readonly verdict: Verdict }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Pip size={130} mood={verdict.correct ? 'cheer' : 'sad'} />
      <div>
        <h2 className="font-heading text-[26px] leading-tight font-semibold">
          {verdict.mastered
            ? 'Carte maîtrisée ! 🏆'
            : verdict.correct
              ? 'Bravo !'
              : 'Pas grave'}
        </h2>
        <p className="text-ink-soft mt-1.5 text-sm font-bold">
          {verdict.mastered
            ? 'Tu la connais par cœur, elle ne reviendra plus.'
            : verdict.correct
              ? 'Elle reviendra plus tard.'
              : 'On la revoit bientôt.'}
        </p>
      </div>
      <RankDots rank={verdict.rank} />
    </div>
  )
}

function RankDots({ rank }: { readonly rank: number }) {
  return (
    <span
      className="inline-flex gap-1.5"
      aria-label={`Rang ${String(rank)} sur ${String(RANK_COUNT)}`}
    >
      {Array.from({ length: RANK_COUNT }, (_, i) => (
        <span
          key={i}
          className="size-2.5 rounded-full transition-colors"
          style={{
            background:
              i < rank ? RANK_COLORS[rank - 1] : 'var(--primary-soft)',
          }}
        />
      ))}
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
        <Pip size={140} mood="cheer" />
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
              : `On revoit bientôt ${missed === 1 ? 'la carte' : `les ${String(missed)} cartes`} que tu n’as pas ${missed === 1 ? 'sue' : 'sues'} 🎯`}
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
