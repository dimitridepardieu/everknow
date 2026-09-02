import { useState } from 'react'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Type } from 'lucide-react'

import { CreateGenerating } from '@/components/create-generating'
import { FieldError } from '@/components/field-error'
import { FlowHeader } from '@/components/flow-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useGenerateFlashcards } from '@/lib/cards'
import { writePendingCards } from '@/lib/pending-cards'
import { sourceTextSchema } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/create/')({
  component: CreatePage,
})

function CreatePage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const mutation = useGenerateFlashcards()

  // Generation takes over the screen while it runs; on success the cards are
  // handed to the review route, so this screen is only ever the paste step.
  if (mutation.isPending || mutation.isSuccess) return <CreateGenerating />

  return (
    <PasteScreen
      text={text}
      onChange={setText}
      onClose={() => void navigate({ to: '/learn' })}
      onGenerate={() =>
        mutation.mutate(text.trim(), {
          onSuccess: (data) => {
            writePendingCards(data.cards)
            void navigate({ to: '/create/review' })
          },
          onError: () => {
            toast.add({
              type: 'error',
              title: 'Eve n’a pas pu créer les cartes',
              description: 'Réessaie dans quelques instants.',
            })
          },
        })
      }
    />
  )
}

function PasteScreen({
  text,
  onChange,
  onClose,
  onGenerate,
}: {
  readonly text: string
  readonly onChange: (v: string) => void
  readonly onClose: () => void
  readonly onGenerate: () => void
}) {
  // Nothing is flagged until the first attempt, then the error corrects itself
  // as the text grows. An empty box on arrival isn't a mistake, just the
  // starting state — and a button that greys out never says why.
  const [attempted, setAttempted] = useState(false)
  const result = sourceTextSchema.safeParse(text)
  const error =
    attempted && !result.success ? result.error.issues[0]?.message : null
  const count = [...text.trim()].length

  const submit = () => {
    setAttempted(true)
    if (result.success) onGenerate()
  }

  return (
    <main className="flex min-h-dvh flex-col pb-9">
      <FlowHeader variant="close" onActivate={onClose} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <div className="mt-4 mb-4 flex flex-col items-center gap-2 text-center">
          <span
            className="flex size-16 items-center justify-center rounded-2xl text-white"
            style={{
              background: 'var(--primary)',
              boxShadow: '0 5px 0 var(--primary-dark)',
            }}
          >
            <Type className="size-8" strokeWidth={2.5} />
          </span>
          <h2 className="font-heading text-2xl leading-tight font-semibold">
            Colle ou tape ton texte
          </h2>
        </div>

        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          placeholder="Colle ici une leçon, un résumé, un cours…"
          aria-invalid={error !== null}
          className="text-ink placeholder:text-ink-muted focus-visible:border-primary min-h-52 flex-1 rounded-3xl border-2 border-transparent bg-white p-4 text-base font-semibold shadow-[0_4px_0_#1b1b3a14] transition-shadow focus-visible:shadow-[0_4px_0_var(--primary-dark)] focus-visible:ring-0"
        />

        <p className="text-ink-muted mt-2 px-1 text-xs font-bold">
          {count} / 5000
        </p>

        {error && <FieldError className="mt-2 px-1">{error}</FieldError>}

        <Button type="button" onClick={submit} className="mt-4 w-full">
          Générer les cartes
        </Button>
      </div>
    </main>
  )
}
