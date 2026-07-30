import { Eve } from '@/components/eve'
import type { EveMood } from '@/components/eve-moods'

// Eve framed in a coloured ring, standing in for a per-profile avatar. Tint
// comes from the caller (usually profileColor) since a profile has no stored
// colour of its own.
//
// The avatar never uses the open-eyed moods: an avatar is looked at all day and
// in grids, where two pupils read as insistent and blur below ~44px. `doux`
// says who it is; `tendre` distinguishes the parent without another drawing.
export function EveAvatar({
  color,
  size = 84,
  mood = 'doux',
}: {
  readonly color: string
  readonly size?: number
  readonly mood?: EveMood
}) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white"
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 ${String(Math.max(2, size * 0.05))}px ${color}`,
      }}
    >
      {/* The bare threshold reads the frame, not Eve's own size: a 40px avatar
          renders her at 34, and dropping her face there is the point. */}
      <Eve
        size={size * 0.84}
        mood={mood}
        color={color}
        bare={size < 40}
        portrait
      />
    </div>
  )
}
