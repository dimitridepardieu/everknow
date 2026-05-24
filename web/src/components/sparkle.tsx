import type { CSSProperties } from 'react'

interface SparkleProps {
  readonly size?: number
  readonly className?: string
  readonly style?: CSSProperties
}

// The filled four-point star from the Claude Design prototype. Lucide only
// ships an outline sparkle, so this is bespoke. Uses currentColor, so color
// is controlled with text-* utilities (e.g. text-white/55).
export function Sparkle({ size = 24, className, style }: SparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 2l1.5 6L20 9.5 13.5 11 12 18l-1.5-7L4 9.5 10.5 8z" />
    </svg>
  )
}
