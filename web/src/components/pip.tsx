import type { ReactNode } from 'react'

// Pip — the Flashcard Academy mascot: a small, round, friendly creature
// built from simple geometric shapes. Ported 1:1 from the Claude Design
// prototype (mascot.jsx); the SVG paths are intentionally unchanged.

export type PipMood = 'happy' | 'cheer' | 'sad' | 'wow' | 'sleep' | 'think'

interface PipProps {
  readonly size?: number
  readonly mood?: PipMood
  readonly tilt?: number
  /** Body color. Defaults to Pip's signature sky blue. */
  readonly color?: string
  readonly className?: string
}

const INK = '#1B1B3A'
const PINK = '#FF8FB1'
const LEAF = '#2EC4B6'
const LEAF_DARK = '#1E9085'

export function Pip({
  size = 140,
  mood = 'happy',
  tilt = 0,
  color = '#4FC1F0',
  className,
}: PipProps) {
  const blue = color
  const blueDark = shade(blue, -0.25)
  const blueLight = shade(blue, 0.35)

  const cheerEye = (cx: number) => (
    <path
      key={cx}
      d={`M${cx - 7} 68 Q${cx} 60 ${cx + 7} 68`}
      stroke={INK}
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
    />
  )
  const normalEye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="68" rx="5.5" ry="6.5" fill={INK} />
      <circle cx={cx + 2} cy="65" r="2" fill="white" />
    </g>
  )
  const sadEye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="70" rx="4.5" ry="5" fill={INK} />
      <path
        d={`M${cx - 8} 60 Q${cx - 2} 64 ${cx + 4} 60`}
        stroke={INK}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
  const wowEye = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy="68" r="7.5" fill="white" stroke={INK} strokeWidth="2.5" />
      <circle cx={cx + 1} cy="70" r="3.5" fill={INK} />
    </g>
  )
  const sleepEye = (cx: number) => (
    <path
      key={cx}
      d={`M${cx - 7} 68 Q${cx} 72 ${cx + 7} 68`}
      stroke={INK}
      strokeWidth="4.5"
      fill="none"
      strokeLinecap="round"
    />
  )
  const thinkEye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="70" rx="5" ry="5.5" fill={INK} />
      <circle cx={cx + 2} cy="68" r="1.5" fill="white" />
    </g>
  )

  const eyesByMood: Record<PipMood, ReactNode[]> = {
    happy: [normalEye(55), normalEye(85)],
    cheer: [cheerEye(55), cheerEye(85)],
    sad: [sadEye(55), sadEye(85)],
    wow: [wowEye(55), wowEye(85)],
    sleep: [sleepEye(55), sleepEye(85)],
    think: [thinkEye(55), thinkEye(85)],
  }
  const eyes = eyesByMood[mood]

  let mouth: ReactNode
  if (mood === 'cheer') {
    mouth = (
      <g>
        <path d="M52 88 Q70 108 88 88 Z" fill={INK} />
        <path d="M62 100 Q70 106 78 100" fill={PINK} opacity="0.9" />
      </g>
    )
  } else if (mood === 'sad') {
    mouth = (
      <path
        d="M58 98 Q70 90 82 98"
        stroke={INK}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    )
  } else if (mood === 'wow') {
    mouth = <ellipse cx="70" cy="95" rx="6" ry="8" fill={INK} />
  } else if (mood === 'sleep') {
    mouth = (
      <path
        d="M62 92 Q70 96 78 92"
        stroke={INK}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    )
  } else if (mood === 'think') {
    mouth = (
      <path
        d="M62 92 L78 92"
        stroke={INK}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    )
  } else {
    mouth = (
      <path
        d="M58 88 Q70 100 82 88"
        stroke={INK}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className={className}
      style={{ transform: `rotate(${tilt}deg)` }}
      role="img"
      aria-label="Pip"
    >
      {/* feet */}
      <ellipse cx="52" cy="127" rx="13" ry="6" fill={blueDark} />
      <ellipse cx="88" cy="127" rx="13" ry="6" fill={blueDark} />
      {/* body shadow */}
      <ellipse cx="70" cy="128" rx="42" ry="5" fill="rgba(0,0,0,0.08)" />
      {/* body */}
      <rect x="22" y="32" width="96" height="94" rx="46" fill={blue} />
      {/* body shading bottom */}
      <path
        d="M22 90 Q22 126 68 126 L72 126 Q118 126 118 90 L118 78 Q70 110 22 78 Z"
        fill={blueDark}
        opacity="0.18"
      />
      {/* belly */}
      <ellipse cx="70" cy="95" rx="30" ry="22" fill={blueLight} opacity="0.65" />
      {/* leaf antenna */}
      <path d="M70 36 C 56 18 66 8 72 12 C 84 18 80 32 70 36 Z" fill={LEAF} />
      <path
        d="M70 36 C 64 28 68 18 72 16"
        stroke={LEAF_DARK}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* cheeks */}
      <ellipse cx="40" cy="82" rx="9" ry="6" fill={PINK} opacity="0.85" />
      <ellipse cx="100" cy="82" rx="9" ry="6" fill={PINK} opacity="0.85" />
      {/* eyes */}
      {eyes}
      {/* mouth */}
      {mouth}
      {/* sparkles for cheer */}
      {mood === 'cheer' && (
        <g>
          <circle cx="20" cy="40" r="3" fill={LEAF} />
          <circle cx="124" cy="50" r="3" fill="#FFC93C" />
          <circle cx="14" cy="80" r="2.5" fill="#FF8FB1" />
          <circle cx="128" cy="90" r="2.5" fill="#6B4EFF" />
        </g>
      )}
      {/* z's for sleep */}
      {mood === 'sleep' && (
        <g fill={INK} fontFamily="Fredoka Variable" fontWeight="600">
          <text x="105" y="35" fontSize="14">
            z
          </text>
          <text x="115" y="22" fontSize="18">
            Z
          </text>
        </g>
      )}
      {/* think bubbles */}
      {mood === 'think' && (
        <g>
          <circle cx="110" cy="50" r="4" fill="white" stroke={INK} strokeWidth="2" />
          <circle cx="120" cy="38" r="6" fill="white" stroke={INK} strokeWidth="2" />
          <text
            x="115"
            y="42"
            fontFamily="Fredoka Variable"
            fontWeight="600"
            fontSize="9"
            fill={INK}
            textAnchor="middle"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  )
}

// shade(hex, amt) — lighten (amt > 0) or darken (amt < 0) a hex color,
// amt in [-1, 1]. Used to derive Pip's body shading from its base color.
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const adj = (c: number) => {
    const v = amt > 0 ? c + (255 - c) * amt : c * (1 + amt)
    return Math.round(Math.max(0, Math.min(255, v)))
  }
  return (
    '#' +
    [adj(r), adj(g), adj(b)].map((v) => v.toString(16).padStart(2, '0')).join('')
  )
}
