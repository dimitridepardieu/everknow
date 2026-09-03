import { useState } from 'react'

import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'

import { CardSession } from '@/components/card-session'
import { Eve } from '@/components/eve'
import { Flashcard } from '@/components/flashcard'
import { FlowHeader } from '@/components/flow-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSaveDeck } from '@/lib/decks'
import { clearPendingCards, readPendingCards } from '@/lib/pending-cards'
import { deckNameSchema } from '@/lib/schemas'
import { useActiveProfile } from '@/lib/use-active-profile'

export const Route = createFileRoute('/_authenticated/create/review')({
  component: ReviewPage,
})

// A generated card the parent is deciding on: kept === null until they choose.
interface DraftCard {
  question: string
  answer: string
  kept: boolean | null
}

function ReviewPage() {
  const navigate = useNavigate()
  const { profile, isLoading } = useActiveProfile()
  const save = useSaveDeck()

  // The generated cards land here from /create via sessionStorage — read once,
  // synchronously, at mount (no useEffect). Refresh or direct visit → empty.
  const [cards, setCards] = useState<DraftCard[] | null>(() => {
    const pending = readPendingCards()
    return pending ? pending.map((c) => ({ ...c, kept: null })) : null
  })
  const [phase, setPhase] = useState<'intro' | 'review' | 'name'>('intro')
  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')

  if (cards === null) return <Navigate to="/create" />
  if (isLoading) return null
  if (!profile) return <Navigate to="/learn" />

  const abort = () => {
    clearPendingCards()
    void navigate({ to: '/learn' })
  }

  const keptCount = cards.filter((c) => c.kept === true).length

  // ─── Saved ────────────────────────────────────────────────
  if (save.isSuccess) {
    return (
      <SavedScreen name={save.data.name} count={keptCount} onDone={abort} />
    )
  }

  // ─── Intro: Eve's done, N cards ready ─────────────────────
  if (phase === 'intro') {
    return (
      <Screen header={<FlowHeader variant="close" onActivate={abort} />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Eve size={130} mood="soft.cheer" />
          <div>
            <p className="font-heading text-ink-muted text-xs font-semibold tracking-[1.5px] uppercase">
              Eve a terminé !
            </p>
            <h1 className="font-heading mt-1 text-[30px] leading-tight font-semibold">
              <span className="text-primary">
                {cards.length} carte{cards.length > 1 ? 's' : ''}
              </span>
              <br />
              {cards.length > 1 ? 'sont prêtes' : 'est prête'}
            </h1>
            <p className="text-ink-soft mt-2 text-sm font-bold">
              On les regarde une par une ?<br />
              Tu choisis lesquelles tu gardes 👇
            </p>
          </div>
        </div>
        <Button onClick={() => setPhase('review')} className="w-full">
          Découvrir les cartes
        </Button>
      </Screen>
    )
  }

  // ─── Name the paquet ──────────────────────────────────────
  if (phase === 'name') {
    const nameResult = deckNameSchema.safeParse(name)
    const error =
      !nameResult.success && name.trim().length > 0
        ? nameResult.error.issues[0]?.message
        : null

    if (keptCount === 0) {
      return (
        <Screen header={<FlowHeader variant="close" onActivate={abort} />}>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Eve size={120} mood="soft.oops" />
            <h1 className="font-heading text-2xl leading-tight font-semibold">
              Aucune carte gardée
            </h1>
            <p className="text-ink-soft text-sm font-bold">
              Repars d’un texte et Eve t’en refait de nouvelles.
            </p>
          </div>
          <Button
            onClick={() => void navigate({ to: '/create' })}
            className="w-full"
          >
            Recommencer
          </Button>
        </Screen>
      )
    }

    return (
      <Screen
        header={
          <FlowHeader variant="back" onActivate={() => setPhase('review')} />
        }
      >
        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <Eve size={80} mood="soft.happy" />
          <p className="font-heading text-ink text-[26px] leading-tight font-semibold">
            {keptCount} carte{keptCount > 1 ? 's' : ''} prête
            {keptCount > 1 ? 's' : ''} à être rangée{keptCount > 1 ? 's' : ''}
          </p>
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          <label
            htmlFor="deck-name"
            className="font-heading text-ink-muted mb-2 text-xs font-semibold tracking-[1px] uppercase"
          >
            Nom du paquet
          </label>
          <Input
            id="deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Ex. Système solaire"
            aria-invalid={error !== null}
            className="text-ink placeholder:text-ink-muted focus-visible:border-primary h-auto rounded-2xl border-2 border-transparent bg-white p-4 text-base font-semibold shadow-[0_4px_0_#1b1b3a14] transition-shadow focus-visible:shadow-[0_4px_0_var(--primary-dark)] focus-visible:ring-0"
          />
          {error && (
            <span className="text-destructive mt-2 px-1 text-xs font-bold">
              {error}
            </span>
          )}
          {save.isError && (
            <p className="text-destructive mt-3 px-1 text-xs font-bold">
              Le rangement a échoué. Réessaie.
            </p>
          )}
        </div>

        <Button
          onClick={() =>
            save.mutate(
              {
                profileId: profile.id,
                name: name.trim(),
                cards: cards
                  .filter((c) => c.kept === true)
                  .map(({ question, answer }) => ({ question, answer })),
              },
              { onSuccess: () => clearPendingCards() },
            )
          }
          disabled={!nameResult.success || save.isPending}
          className="w-full"
        >
          {save.isPending ? 'Rangement…' : 'Ranger les cartes'}
        </Button>
      </Screen>
    )
  }

  // ─── Review, card by card ─────────────────────────────────
  const card = cards[index]
  const rejectedCount = cards.filter((c) => c.kept === false).length

  const decide = (kept: boolean) => {
    setCards((prev) => prev!.map((c, i) => (i === index ? { ...c, kept } : c)))
    if (index + 1 >= cards.length) setPhase('name')
    else setIndex(index + 1)
  }

  return (
    <CardSession
      onClose={abort}
      // Counts the card being decided as done, like training counts the one
      // just answered — so the bar reaches the end rather than stopping short
      // on the last card of the batch.
      progress={(index + 1) / cards.length}
      status={`${String(index + 1)}/${String(cards.length)}`}
      bottom={
        <>
          {/* The tally sits where training shows its verdict: next to the
              buttons that move it, in the space the frame already reserves.
              Hidden until the first decision — two zeroes say nothing. */}
          {index > 0 && (
            <p className="text-ink-muted mb-8 text-center text-[13px] font-bold">
              {keptCount} gardée{keptCount > 1 ? 's' : ''} · {rejectedCount}{' '}
              supprimée{rejectedCount > 1 ? 's' : ''}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => decide(false)}
              className="h-16 flex-1 gap-1.5 rounded-[20px]"
            >
              <X className="size-6" strokeWidth={3.5} />
              Supprimer
            </Button>
            <Button
              variant="success"
              onClick={() => decide(true)}
              className="h-16 flex-1 gap-1.5 rounded-[20px]"
            >
              <Check className="size-6" strokeWidth={4} />
              Garder
            </Button>
          </div>
        </>
      }
    >
      <Flashcard question={card.question} answer={card.answer} labelled />
    </CardSession>
  )
}

// ─── Shared chrome ──────────────────────────────────────────

function Screen({
  header,
  children,
}: {
  readonly header?: React.ReactNode
  readonly children: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col pb-9">
      {header}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        {children}
      </div>
    </main>
  )
}

function SavedScreen({
  name,
  count,
  onDone,
}: {
  readonly name: string
  readonly count: number
  readonly onDone: () => void
}) {
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
            Trop bien
          </p>
          <h1 className="font-heading mt-1.5 text-[30px] leading-tight font-semibold">
            {count} carte{count > 1 ? 's' : ''} rangée{count > 1 ? 's' : ''} !
          </h1>
        </div>
        <div className="flex w-full items-center gap-3 rounded-2xl bg-white/15 p-3.5 text-left backdrop-blur-sm">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
            🃏
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-base font-semibold">
              {name}
            </p>
            <p className="mt-0.5 text-xs font-bold text-white/80">
              prêt à réviser
            </p>
          </div>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={onDone}
        className="w-full bg-white text-[var(--success-dark)]"
      >
        Terminé
      </Button>
    </main>
  )
}
