import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { EveAvatar } from '@/components/eve-avatar'
import { Sparkle } from '@/components/sparkle'
import { useActiveProfileId } from '@/lib/active-profile-context'
import { profileColor } from '@/lib/profile-color'
import { useProfiles } from '@/lib/profiles'

export const Route = createFileRoute('/_authenticated/who')({
  component: WhoPage,
})

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
                  <EveAvatar color={profileColor(i)} />
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
