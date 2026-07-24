import { Pip } from '@/components/pip'

// Pip ringed in a coloured circle, standing in for a per-profile avatar. Tint
// comes from the caller (usually profileColor) since a profile has no stored
// colour of its own.
export function PipAvatar({
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
