import { useState } from 'react'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Type } from 'lucide-react'

import { CreateGenerating } from '@/components/create-generating'
import { FieldError } from '@/components/field-error'
import { FlowHeader } from '@/components/flow-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useGenerateFlashcards } from '@/lib/cards'
import { writePendingCards } from '@/lib/pending-cards'
import { sourceTextSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

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
          onError: (error) => {
            // A 400 means the text itself yielded nothing — "réessaie" would
            // send the same text back for the same answer. Anything else is a
            // failure on our side, where trying again is the right advice.
            const rejected = error instanceof ApiError && error.status === 400
            toast.add({
              type: 'error',
              title: rejected
                ? 'Ce texte n’a pas donné de cartes'
                : 'Eve n’a pas pu créer les cartes',
              description: rejected
                ? 'Essaie avec une leçon ou un résumé plus complet.'
                : 'Réessaie dans quelques instants.',
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
  // Three levels, in this order: nothing at all until a press is refused, then
  // the outline and the message, then — as soon as the parent types, having
  // understood — only the count in red. The loud part has done its job; what
  // stays is a fact about the text, not a reprimand.
  const [warning, setWarning] = useState<'none' | 'full' | 'count'>('none')
  const result = sourceTextSchema.safeParse(text)
  const count = [...text.trim()].length

  const blocked = warning === 'full' && !result.success
  const countIsShort = warning !== 'none' && !result.success

  const submit = () => {
    if (result.success) {
      onGenerate()
      return
    }
    setWarning('full')
  }

  const change = (value: string) => {
    setWarning((w) => (w === 'full' ? 'count' : w))
    onChange(value)
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
          onChange={(e) => change(e.target.value)}
          autoFocus
          placeholder="Colle ici une leçon, un résumé, un cours…"
          aria-invalid={blocked}
          className="text-ink placeholder:text-ink-muted focus-visible:border-primary aria-invalid:border-destructive min-h-52 flex-1 rounded-3xl border-2 border-transparent bg-white p-4 text-base font-semibold shadow-[0_4px_0_#1b1b3a14] transition-shadow focus-visible:shadow-[0_4px_0_var(--primary-dark)] focus-visible:ring-0 aria-invalid:ring-0"
        />

        {/* One slot under the box, holding one thing at a time: the message
            takes the counter's place while the press is being refused, and
            hands it back — in red — as soon as the parent starts typing. */}
        <div className="mt-2 px-1">
          {blocked ? (
            <FieldError>{result.error.issues[0]?.message}</FieldError>
          ) : (
            <span
              className={cn(
                'text-xs font-bold',
                countIsShort ? 'text-destructive-dark' : 'text-ink-muted',
              )}
            >
              {count} / 5000
            </span>
          )}
        </div>

        <Button type="button" onClick={submit} className="mt-4 w-full">
          Générer les cartes
        </Button>
      </div>
    </main>
  )
}
