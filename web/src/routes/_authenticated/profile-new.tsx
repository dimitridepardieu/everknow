import type { FormEvent } from 'react'
import { useState } from 'react'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateProfile } from '@/lib/profiles'

export const Route = createFileRoute('/_authenticated/profile-new')({
  component: NewProfilePage,
})

function NewProfilePage() {
  const navigate = useNavigate()
  const mutation = useCreateProfile()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')

  const trimmedName = name.trim()
  const canSubmit = trimmedName.length > 0 && !mutation.isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const ageNum = Number(age)
    const parsedAge =
      age.trim() === '' || !Number.isInteger(ageNum) ? undefined : ageNum
    mutation.mutate(
      { name: trimmedName, age: parsedAge },
      { onSuccess: () => void navigate({ to: '/who' }) },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <div>
        <Link
          to="/who"
          aria-label="Retour"
          className="text-ink-muted hover:bg-foreground/5 flex size-9 cursor-pointer items-center justify-center rounded-xl"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={3} />
        </Link>
      </div>

      <div className="mt-2 mb-6 flex flex-col items-center text-center">
        <Pip size={80} mood="cheer" />
        <h1 className="font-heading mt-3 text-[26px] font-semibold">
          Nouveau profil
        </h1>
        <p className="text-ink-soft mt-1 text-sm font-bold">
          Ajoute un enfant qui va réviser.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <Label
          htmlFor="name"
          className="font-heading text-ink-muted mb-2 block text-xs font-semibold tracking-[1.5px] uppercase"
        >
          Prénom
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Léa"
          className="mb-5"
        />

        <Label
          htmlFor="age"
          className="font-heading text-ink-muted mb-2 block text-xs font-semibold tracking-[1.5px] uppercase"
        >
          Âge (optionnel)
        </Label>
        <Input
          id="age"
          type="number"
          inputMode="numeric"
          min={0}
          max={150}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="7"
        />

        {mutation.isError && (
          <p className="text-destructive mx-1 mt-4 text-xs font-bold">
            Impossible de créer le profil. Réessaie.
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className="mt-auto w-full">
          {mutation.isPending ? 'Création…' : 'Créer le profil'}
        </Button>
      </form>
    </main>
  )
}
