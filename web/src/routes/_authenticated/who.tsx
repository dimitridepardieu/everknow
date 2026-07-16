import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Pip } from '@/components/pip'
import { Sparkle } from '@/components/sparkle'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { useProfiles } from '@/lib/profiles'

export const Route = createFileRoute('/_authenticated/who')({
  component: WhoPage,
})

// Presentation-only: profiles carry no stored colour yet, so each Pip is
// tinted by position. Deterministic, so a profile keeps the same colour.
const AVATAR_COLORS = ['#FFD86A', '#FF8FB1', '#4FC1F0', '#7AD9C8', '#C5A8FF']

function PipAvatar({
  color,
  size = 84,
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

function WhoPage() {
  const { data: profiles } = useProfiles()
  const { setActiveProfileId } = useActiveProfileId()
  const navigate = useNavigate()

  if (profiles === undefined) return null

  const pick = (id: number) => {
    setActiveProfileId(id)
    void navigate({ to: '/learn' })
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden px-6 py-12 text-white"
      style={{
        background:
          'linear-gradient(170deg, var(--primary) 0%, var(--primary-dark) 100%)',
      }}
    >
      <Sparkle
        size={16}
        className="absolute top-[12%] left-[10%]"
        style={{ color: '#FFC93C', opacity: 0.55 }}
      />
      <Sparkle
        size={12}
        className="absolute top-[20%] right-[14%]"
        style={{ color: '#FFC93C', opacity: 0.5 }}
      />
      <Sparkle
        size={14}
        className="absolute bottom-[34%] left-[14%]"
        style={{ color: '#FFC93C', opacity: 0.5 }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-9 text-center">
        <div>
          <p className="font-heading text-xs font-medium tracking-[2px] text-white/70 uppercase">
            Ta famille
          </p>
          <h1 className="font-heading mt-1.5 text-[32px] leading-tight font-semibold">
            Qui est-ce ?
          </h1>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-bold text-white/80">
              Aucun profil pour l’instant.
            </p>
            <Link
              to="/profiles/new"
              className="text-primary font-heading flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold uppercase shadow-[0_5px_0_rgba(0,0,0,0.18)]"
            >
              <Plus className="size-5" strokeWidth={3} />
              Créer un profil
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap justify-center gap-5">
              {profiles.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  className="flex cursor-pointer flex-col items-center gap-2"
                >
                  <PipAvatar color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                  <span className="font-heading text-sm font-semibold">
                    {p.name ?? 'Sans nom'}
                  </span>
                </button>
              ))}
            </div>

            <Link
              to="/profiles/new"
              className="font-heading mx-auto flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white/85"
            >
              <Plus className="size-4" strokeWidth={3} />
              Ajouter un enfant
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
