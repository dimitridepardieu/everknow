import type { FormEvent } from 'react'
import { useState } from 'react'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateProfile } from '@/lib/profiles'
import { profileAgeSchema } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/profiles/new')({
  component: NewProfilePage,
})

// A child profile has no stored colour yet; the preview shows Pip in a warm
// default so the screen feels alive while the parent types.
const PREVIEW_COLOR = '#FFD86A'

function PipAvatar({
  color,
  size = 104,
}: {
  readonly color: string
  readonly size?: number
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--background)',
        boxShadow: `0 0 0 4px white, 0 0 0 6px ${color}`,
      }}
    >
      <Pip size={size * 1.05} mood="happy" color={color} />
    </div>
  )
}

const inputClass =
  'border-border focus-visible:border-primary text-ink placeholder:text-ink-muted h-auto rounded-2xl border-2 bg-white py-3.5 text-lg font-semibold shadow-[0_4px_0_#1b1b3a14] transition-shadow focus-visible:shadow-[0_4px_0_var(--primary-dark)] focus-visible:ring-0'

const labelClass =
  'font-heading text-ink-muted mb-2 block text-xs font-semibold tracking-[1.5px] uppercase'

function NewProfilePage() {
  const navigate = useNavigate()
  const mutation = useCreateProfile()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')

  const trimmedName = name.trim()
  const trimmedAge = age.trim()
  const ageResult =
    trimmedAge === '' ? null : profileAgeSchema.safeParse(trimmedAge)
  const ageError =
    ageResult && !ageResult.success ? ageResult.error.issues[0]?.message : null
  const canSubmit = trimmedName.length > 0 && !ageError && !mutation.isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const parsedAge = ageResult?.success ? ageResult.data : undefined
    mutation.mutate(
      { name: trimmedName, age: parsedAge },
      { onSuccess: () => void navigate({ to: '/who' }) },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[50px] pb-9">
      <div className="mb-1 flex items-center gap-3">
        <Link
          to="/who"
          aria-label="Retour"
          className="text-ink-muted hover:bg-foreground/5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={3} />
        </Link>
        <div>
          <p className="font-heading text-ink-muted text-xs font-semibold tracking-[1.5px] uppercase">
            Nouveau profil
          </p>
          <h1 className="font-heading text-lg font-semibold">Crée un enfant</h1>
        </div>
      </div>

      <div className="mt-4 mb-7 flex flex-col items-center">
        <PipAvatar color={PREVIEW_COLOR} />
        <p className="font-heading text-ink mt-2 text-[17px] font-semibold">
          {trimmedName || 'Prénom'}
        </p>
        {ageResult?.success && (
          <p className="font-heading text-ink-muted mt-0.5 text-xs font-medium">
            {ageResult.data} ans
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <Label htmlFor="name" className={labelClass}>
          Prénom
        </Label>
        <div className="relative mb-5">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg">
            👋
          </span>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Prénom de ton enfant"
            className={`${inputClass} pr-4 pl-12`}
          />
        </div>

        <Label htmlFor="age" className={labelClass}>
          Âge (optionnel)
        </Label>
        <Input
          id="age"
          type="number"
          inputMode="numeric"
          min={0}
          max={150}
          step={1}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="8"
          aria-invalid={ageError !== null}
          className={`${inputClass} px-4`}
        />
        {ageError && (
          <p className="text-destructive mx-1 mt-2 text-xs font-bold">
            {ageError}
          </p>
        )}

        {mutation.isError && (
          <p className="text-destructive mx-1 mt-4 text-xs font-bold">
            Impossible de créer le profil. Réessaie.
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className="mt-auto w-full">
          <Check className="size-5" strokeWidth={3} />
          {mutation.isPending ? 'Création…' : 'Créer le profil'}
        </Button>
      </form>
    </main>
  )
}
