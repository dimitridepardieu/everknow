import { createFileRoute } from '@tanstack/react-router'

import { Eve } from '@/components/eve'
import { EveAvatar } from '@/components/eve-avatar'
import { MOODS } from '@/components/eve-moods'
import type { EveMood } from '@/components/eve-moods'
import { profileColor } from '@/lib/profile-color'

// Reference sheet for Eve — the local mirror of the Claude Design boards, so a
// mood can be picked by looking rather than by reading the source. Not linked
// from anywhere: reach it at /eve.
export const Route = createFileRoute('/eve')({
  component: EveSheet,
})

const SOFT_GROUPS = [
  {
    title: 'La session de révision',
    moods: [
      'soft.idle',
      'soft.focus',
      'soft.cheer',
      'soft.encourage',
      'soft.proud',
    ],
  },
  {
    title: 'L’attente et la création',
    moods: [
      'soft.think',
      'soft.loading',
      'soft.celebrate',
      'soft.wow',
      'soft.sleep',
    ],
  },
  {
    title: 'Le caractère',
    moods: [
      'soft.happy',
      'soft.wink',
      'soft.hello',
      'soft.shy',
      'soft.curious',
      'soft.determined',
    ],
  },
  {
    title: 'Les émotions basses · jamais un reproche',
    moods: [
      'soft.sad',
      'soft.oops',
      'soft.concerned',
      'soft.confused',
      'soft.relief',
    ],
  },
  {
    title: 'Ce qui manquait',
    moods: ['soft.love', 'soft.yawn', 'soft.listen', 'soft.calm', 'soft.blink'],
  },
] as const satisfies readonly { title: string; moods: readonly EveMood[] }[]

const OPEN_GROUPS = [
  {
    title: 'Yeux ouverts · les deux seules exceptions',
    moods: ['wow', 'gazeLeft', 'gazeRight'],
  },
  {
    title: 'Le jeu d’origine · conservé, non utilisé dans l’app',
    moods: [
      'idle',
      'happy',
      'cheer',
      'proud',
      'celebrate',
      'encourage',
      'concerned',
      'think',
      'loading',
      'wink',
      'curious',
      'focus',
      'determined',
      'confused',
      'shy',
      'sleep',
      'blink',
    ],
  },
] as const satisfies readonly { title: string; moods: readonly EveMood[] }[]

const PALETTE = [
  ['#6B4EFF', 'Corps · --primary'],
  ['#4D33CC', 'Ombre · --primary-dark'],
  ['#A99BFF', 'Pieds'],
  ['#EFEBFF', 'Traits sur l’ombre · --primary-soft'],
  ['#1B1B3A', 'Traits · --ink'],
] as const

const SURFACES = [
  ['#FFF7EC', 'Crème'],
  ['#FFFFFF', 'Blanc'],
  ['#EFEBFF', 'Violet clair'],
  ['#3C2B8F', 'Nuit'],
] as const

const AVATAR_SIZES = [
  [144, 'Profil'],
  [104, 'Création'],
  [84, 'Grille'],
  [70, 'Liste'],
  [52, 'En-tête'],
  [44, 'Barre'],
  [36, 'Puce'],
] as const

const RULES = [
  'Les yeux sourient ou se ferment. Ils ne fixent que pour montrer quelque chose.',
  'La ligne d’ombre ne bouge jamais : elle tombe toujours entre les deux yeux.',
  'Un trait qui entre dans l’ombre passe en violet pâle. Jamais d’encre sur l’ombre.',
  'Aucun contour, aucun dégradé, jamais plus de trois violets.',
  'Les sourcils tombants sont réservés à sad et concerned : nulle part ailleurs.',
  'cheer, celebrate et love sont rares — les garder pour les vrais moments.',
  'Une seule larme, et jamais face à une erreur de l’enfant.',
  'Le logo n’a pas de visage. Eve ne remplace jamais le logo.',
  'Ne jamais poser Eve sur du --primary plein : son corps y disparaît.',
] as const

function Label({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="font-heading text-ink-soft text-[11.5px] font-semibold tracking-[1.3px] uppercase">
      {children}
    </p>
  )
}

function Card({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_3px_0_rgba(27,27,58,.08),inset_0_0_0_2px_rgba(27,27,58,.06)]">
      {children}
    </div>
  )
}

function MoodGrid({ moods }: { readonly moods: readonly EveMood[] }) {
  return (
    <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {moods.map((mood) => (
        <div
          key={mood}
          className="rounded-2xl bg-white p-3.5 shadow-[0_3px_0_rgba(27,27,58,.08),inset_0_0_0_2px_rgba(27,27,58,.06)]"
        >
          <div className="bg-background grid h-[138px] place-items-center rounded-[15px]">
            <Eve size={124} mood={mood} />
          </div>
          <p className="font-heading mt-2.5 text-[15px] font-semibold">
            {mood.replace('soft.', '')}
          </p>
          <p className="text-ink-soft mt-0.5 text-[12.5px] leading-snug font-semibold">
            {MOODS[mood].use}
          </p>
        </div>
      ))}
    </div>
  )
}

function EveSheet() {
  return (
    <main className="bg-background min-h-dvh px-5 py-9 md:px-9">
      <p className="font-heading text-primary text-[12.5px] font-semibold tracking-[1.6px] uppercase">
        Everknow · planche de mascotte
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-8">
        <Eve size={180} mood="soft.happy" />
        <div className="min-w-[300px] flex-1">
          <h1 className="font-heading text-primary text-[44px] leading-none font-bold tracking-[-0.03em]">
            Eve
          </h1>
          <p className="text-ink-soft mt-2.5 text-base leading-relaxed font-semibold">
            Elle est le logo vu de plus près. Le premier disque fait son corps,
            le second devient son ombre, et la ligne qui les sépare tombe entre
            ses yeux — un œil dans le jour, un œil dans la nuit.{' '}
            <strong>
              Le logo garde ses deux disques sobres ; Eve vit dans l’app.
            </strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-5">
            {PALETTE.map(([hex, name]) => (
              <div key={hex} className="flex items-center gap-2">
                <span
                  className="size-[22px] rounded-[7px] shadow-[inset_0_0_0_1px_rgba(27,27,58,.1)]"
                  style={{ background: hex }}
                />
                <span className="text-ink-soft text-[12.5px] font-bold">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="font-heading mt-9 text-2xl font-semibold">
        Le jeu doux · celui que l’app utilise
      </h2>
      <p className="text-ink-soft mt-1 max-w-[760px] text-[14.5px] leading-relaxed font-semibold">
        Aucune humeur n’ouvre les yeux : ils sourient en arc ou se ferment. Ce
        que les pupilles faisaient, ce sont les sourcils, la bouche et
        l’inclinaison qui le portent — plus calme, et bien plus lisible en
        petit.
      </p>
      {SOFT_GROUPS.map((g) => (
        <section key={g.title} className="mt-7">
          <h3 className="font-heading text-[19px] font-semibold">{g.title}</h3>
          <MoodGrid moods={g.moods} />
        </section>
      ))}

      <h2 className="font-heading mt-10 text-2xl font-semibold">
        Le jeu à yeux ouverts
      </h2>
      <p className="text-ink-soft mt-1 max-w-[760px] text-[14.5px] leading-relaxed font-semibold">
        Deux cas seulement le justifient : la surprise franche et le regard
        dirigé, quand Eve doit montrer un bouton ou un mot. Le reste est gardé
        pour référence.
      </p>
      {OPEN_GROUPS.map((g) => (
        <section key={g.title} className="mt-7">
          <h3 className="font-heading text-[19px] font-semibold">{g.title}</h3>
          <MoodGrid moods={g.moods} />
        </section>
      ))}

      <h2 className="font-heading mt-10 text-2xl font-semibold">
        Les avatars de profil
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <Label>Les quatre expressions</Label>
          <div className="mt-4 flex flex-wrap gap-6">
            {(['doux', 'tendre', 'soft.cheer', 'happy'] as const).map(
              (mood) => (
                <div key={mood} className="text-center">
                  <EveAvatar size={112} color="#FFA28C" mood={mood} />
                  <p className="font-heading mt-2 text-[15px] font-semibold">
                    {mood.replace('soft.', '')}
                  </p>
                </div>
              ),
            )}
          </div>
          <p className="text-ink-soft mt-4 text-[13.5px] leading-relaxed font-semibold">
            <strong>doux</strong> par défaut, <strong>tendre</strong> pour le
            profil parent : une bouche plus petite suffit à le distinguer sans
            changer de dessin ni de couleur.
          </p>
        </Card>

        <Card>
          <Label>Les teintes de la famille</Label>
          <div className="mt-4 flex flex-wrap gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <EveAvatar size={92} color={profileColor(i)} />
                <p className="text-ink-muted mt-1.5 font-mono text-[11px] font-semibold">
                  {profileColor(i)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-ink-soft mt-4 text-[13.5px] leading-relaxed font-semibold">
            La teinte vient du rang du profil dans la famille. Eve dérive ses
            trois violets de cette couleur, et choisit la couleur de ses traits
            par contraste avec l’ombre teintée.
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <Label>Les tailles réellement utilisées</Label>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {AVATAR_SIZES.map(([size, name]) => (
              <div key={size} className="text-center">
                <EveAvatar size={size} color="#7AD9C8" />
                <p className="text-ink-soft mt-1.5 text-[11.5px] font-bold">
                  {name} · {size}
                </p>
              </div>
            ))}
          </div>
          <p className="text-ink-soft mt-4 text-[13.5px] leading-relaxed font-semibold">
            Sous 40 px, le composant retire les traits de lui-même : il ne reste
            que le corps, l’ombre et les pieds.
          </p>
        </Card>

        <Card>
          <Label>Sur les fonds de l’app</Label>
          <div className="mt-4 flex flex-wrap gap-3">
            {SURFACES.map(([bg, name]) => (
              <div key={bg} className="text-center">
                <div
                  className="relative grid size-[108px] place-items-center rounded-2xl shadow-[inset_0_0_0_1px_rgba(27,27,58,.08)]"
                  style={{ background: bg }}
                >
                  {bg === '#3C2B8F' && (
                    <span className="absolute size-[84px] rounded-full bg-[#EFEBFF] opacity-[0.16]" />
                  )}
                  <Eve size={96} mood="soft.idle" />
                </div>
                <p className="text-ink-soft mt-1.5 text-xs font-bold">{name}</p>
              </div>
            ))}
          </div>
          <p className="text-ink-soft mt-4 text-[13.5px] leading-relaxed font-semibold">
            Sur fond nuit son ombre se confond avec le fond : la tuile applique
            la règle, un halo violet pâle à 16 % derrière elle.
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <Label>Les règles</Label>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {RULES.map((rule) => (
              <p
                key={rule}
                className="text-ink-soft text-sm leading-snug font-semibold"
              >
                · {rule}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
