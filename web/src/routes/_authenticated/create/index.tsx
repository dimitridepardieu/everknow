import { useState } from 'react'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Camera, FileText, Link2, Type } from 'lucide-react'

import { CreateGenerating } from '@/components/create-generating'
import { FlowHeader } from '@/components/flow-header'
import { Pip } from '@/components/pip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useGenerateFlashcards } from '@/lib/cards'
import { writePendingCards } from '@/lib/pending-cards'
import { sourceTextSchema } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/create/')({
  component: CreatePage,
})

function CreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'hub' | 'paste'>('hub')
  const [text, setText] = useState('')
  const mutation = useGenerateFlashcards()

  // Generation takes over the screen while it runs; on success the cards are
  // handed to the review route, so this screen is only ever the hub or paste.
  if (mutation.isPending || mutation.isSuccess) return <CreateGenerating />

  if (step === 'paste') {
    return (
      <PasteScreen
        text={text}
        onChange={setText}
        onBack={() => setStep('hub')}
        onGenerate={() =>
          mutation.mutate(text.trim(), {
            onSuccess: (data) => {
              writePendingCards(data.cards)
              void navigate({ to: '/create/review' })
            },
          })
        }
        isError={mutation.isError}
      />
    )
  }

  return (
    <HubScreen
      onPickText={() => setStep('paste')}
      onClose={() => void navigate({ to: '/learn' })}
    />
  )
}

// ─── Step 1: source hub ─────────────────────────────────────────

// Only text is live. The other three are deliberately shown and disabled:
// they mark where the app is going (URL/PDF/photo, #38) without pretending
// to work. Each carries its own accent so the grid reads like the design.
const SOURCES = [
  {
    id: 'text',
    icon: Type,
    label: 'Du texte',
    desc: 'Colle ton texte',
    accent: 'var(--primary)',
    shadow: 'var(--primary-dark)',
    enabled: true,
  },
  {
    id: 'url',
    icon: Link2,
    label: 'Lien web',
    desc: 'Bientôt',
    accent: 'var(--sky)',
    shadow: '#2a9dc9',
    enabled: false,
  },
  {
    id: 'pdf',
    icon: FileText,
    label: 'Un PDF',
    desc: 'Bientôt',
    accent: 'var(--destructive)',
    shadow: '#c9453f',
    enabled: false,
  },
  {
    id: 'photo',
    icon: Camera,
    label: 'Une photo',
    desc: 'Bientôt',
    accent: 'var(--success)',
    shadow: 'var(--success-dark)',
    enabled: false,
  },
] as const

function HubScreen({
  onPickText,
  onClose,
}: {
  readonly onPickText: () => void
  readonly onClose: () => void
}) {
  return (
    <main className="flex min-h-dvh flex-col pb-9">
      <FlowHeader variant="close" onActivate={onClose} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <Pip size={96} mood="cheer" />
          <h2 className="font-heading text-[26px] leading-tight font-semibold">
            D’où viennent
            <br />
            tes flashcards ?
          </h2>
          <p className="text-ink-soft text-sm font-bold">
            Choisis une source, Pip s’occupe du reste ✨
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.enabled}
              onClick={s.enabled ? onPickText : undefined}
              className={
                s.enabled
                  ? 'flex cursor-pointer flex-col gap-2.5 rounded-3xl bg-white p-4 text-left'
                  : 'flex cursor-not-allowed flex-col gap-2.5 rounded-3xl bg-white p-4 text-left opacity-55'
              }
              style={{
                boxShadow: s.enabled
                  ? `0 5px 0 ${s.shadow}, inset 0 0 0 2px ${s.accent}`
                  : '0 3px 0 var(--border), inset 0 0 0 2px var(--border)',
              }}
            >
              <span
                className="flex size-11 items-center justify-center rounded-xl text-white"
                style={{
                  background: s.enabled ? s.accent : 'var(--ink-muted)',
                  boxShadow: s.enabled ? `0 3px 0 ${s.shadow}` : 'none',
                }}
              >
                <s.icon className="size-[22px]" strokeWidth={2.5} />
              </span>
              <span>
                <span className="font-heading text-ink block text-[17px] leading-tight font-semibold">
                  {s.label}
                </span>
                <span className="text-ink-muted mt-1 block text-xs font-bold">
                  {s.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

// ─── Step 2: paste text ─────────────────────────────────────────

function PasteScreen({
  text,
  onChange,
  onBack,
  onGenerate,
  isError,
}: {
  readonly text: string
  readonly onChange: (v: string) => void
  readonly onBack: () => void
  readonly onGenerate: () => void
  readonly isError: boolean
}) {
  const trimmed = text.trim()
  const result = sourceTextSchema.safeParse(text)
  // Only nag once the parent has actually typed something; an empty box on
  // arrival isn't an error, just the starting state.
  const error =
    !result.success && trimmed.length > 0
      ? result.error.issues[0]?.message
      : null
  const count = [...trimmed].length

  return (
    <main className="flex min-h-dvh flex-col pb-9">
      <FlowHeader variant="back" onActivate={onBack} />
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

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-ink-muted text-xs font-bold">
            {count} / 5000
          </span>
          {error && (
            <span className="text-destructive text-xs font-bold">{error}</span>
          )}
        </div>

        {isError && (
          <p className="text-destructive mx-1 mt-3 text-xs font-bold">
            Pip n’a pas pu créer les cartes. Réessaie.
          </p>
        )}

        <Button
          type="button"
          onClick={onGenerate}
          disabled={!result.success}
          className="mt-4 w-full"
        >
          Générer les cartes
        </Button>
      </div>
    </main>
  )
}
