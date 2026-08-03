import { useId, useMemo } from 'react'
import type { ReactNode } from 'react'

import {
  type Brows,
  type EveMood,
  MOODS,
  type MoodSpec,
  type Mouth,
  type Point,
} from '@/components/eve-moods'

// Eve — the Everknow mascot, and the logo seen up close: her body is the
// mark's first disc, the second disc becomes her shadow, and the line between
// them falls between her eyes. Ported from the Claude Design board
// (mascot-eve-final.jsx); the SVG geometry is intentionally unchanged.
//
// The one non-obvious mechanism: every feature (eyes, brows, mouth) is drawn
// twice — once masked to the lit half in ink, once masked to the shadow in a
// pale tint — because ink on the shadow disappears. Hence the two <mask>
// elements and the per-instance ids.
//
// She is aria-hidden everywhere. Every screen that shows her also states in
// words what she is reacting to, and the profile avatars sit next to the name
// they belong to — so announcing "Eve" only pads the label of whatever contains
// her. Give her a name the day a screen leans on her alone to say something.

const EVE = {
  base: '#6B4EFF',
  deep: '#4D33CC',
  light: '#A99BFF',
  onDark: '#EFEBFF',
  prop: '#362780',
  gold: '#FFC93C',
  pink: '#FF8FB1',
  ink: '#1B1B3A',
}

const BODY = { cx: 70, cy: 64, r: 42 }
const SHADOW = { cx: 139, cy: 60, r: 70 }
const EYE_L: Point = [52, 60]
const EYE_R: Point = [84, 60]

// Below this the face turns to mush, so the component drops it and keeps the
// silhouette. Measured on the board, not arbitrary.
const BARE_BELOW = 40

interface EveProps {
  readonly size?: number
  readonly mood?: EveMood
  /** Overrides the mood's own tilt. The board caps expressive tilt at ±8°. */
  readonly tilt?: number
  /** Tints the whole creature; her three violets are derived from it. */
  readonly color?: string
  /** Forces the featureless silhouette. Defaults to `size < 40`. */
  readonly bare?: boolean
  /** Crops to a head-and-shoulders framing for avatars: no feet, no props. */
  readonly portrait?: boolean
  readonly className?: string
}

export function Eve({
  size = 150,
  mood = 'soft.idle',
  tilt,
  color,
  bare: bareProp,
  portrait = false,
  className,
}: EveProps) {
  const uid = useId().replace(/:/g, '')
  const m: MoodSpec = MOODS[mood]

  const c = useMemo(() => {
    if (!color) return EVE
    const deep = shade(color, -0.38)
    const pale = shade(color, 0.88)
    return {
      ...EVE,
      base: color,
      deep,
      light: shade(color, 0.34),
      // A tinted shadow can be light or dark, so the feature colour that
      // contrasts with it flips. Pick it by contrast ratio rather than guessing.
      onDark: contrast(EVE.ink, deep) >= contrast(pale, deep) ? EVE.ink : pale,
      prop: shade(color, -0.5),
    }
  }, [color])

  const rot = tilt ?? m.tilt ?? 0
  const gaze = m.gaze ?? [0, 0]
  const bare = bareProp ?? size < BARE_BELOW
  const moodProps = m.props ?? []
  // A circle crops anything leaving the disc, so a portrait drops the props.
  // Sleep is the one state worth keeping, redrawn inside the shadow.
  const props = portrait || bare ? [] : moodProps
  const portraitZzz = portrait && !bare && moodProps.includes('zzz')

  const openEye = ([x, y]: Point, big = false, squint = false): ReactNode => {
    const rx = big ? 13.5 : 11
    const ry = big ? 15 : squint ? 7 : 12
    const pr = big ? 6.6 : squint ? 4.2 : 5.6
    const dy = squint ? 0 : 1.4
    const gy = squint ? Math.max(-1.5, Math.min(1.5, gaze[1])) : gaze[1]
    return (
      <g key={x}>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" />
        <circle cx={x + gaze[0]} cy={y + dy + gy} r={pr} fill={EVE.ink} />
        <circle
          cx={x + gaze[0] - pr * 0.5}
          cy={y + gy - pr * 0.7}
          r={pr * 0.36}
          fill="#fff"
        />
      </g>
    )
  }

  const openEyes = (): ReactNode => {
    if (m.eyes === 'open') return [openEye(EYE_L), openEye(EYE_R)]
    if (m.eyes === 'wide') return [openEye(EYE_L, true), openEye(EYE_R, true)]
    if (m.eyes === 'squint')
      return [openEye(EYE_L, false, true), openEye(EYE_R, false, true)]
    if (m.eyes === 'wink') return [openEye(EYE_L)]
    return null
  }

  // Everything drawn on the body, in one colour. Called twice, once per mask.
  const features = (col: string): ReactNode => {
    const out: ReactNode[] = []

    if (m.eyes === 'happy')
      out.push(arc(EYE_L, true, col, 4.8), arc(EYE_R, true, col, 4.8))
    if (m.eyes === 'sleep' || m.eyes === 'blink')
      out.push(arc(EYE_L, false, col), arc(EYE_R, false, col))
    if (m.eyes === 'wink') out.push(arc(EYE_R, true, col, 4.8))
    if (m.eyes === 'winkClosed')
      out.push(
        arc(EYE_L, true, col, 4.8),
        <path
          key="wd"
          d={`M${EYE_R[0] - 8.5} ${EYE_R[1] + 1} L${EYE_R[0] + 8.5} ${EYE_R[1] + 1}`}
          stroke={col}
          strokeWidth="4.4"
          fill="none"
          strokeLinecap="round"
        />,
      )

    if (m.tear)
      out.push(
        <path
          key="tear"
          d={`M${EYE_L[0] - 9} ${EYE_L[1] + 8} q5.5 7 0 10.5 q-5.5 -3.5 0 -10.5 z`}
          fill={col}
          opacity="0.9"
        />,
      )

    const brows = BROWS[m.brows ?? 'none']
    if (brows) out.push(...brows(col))

    const mouth = m.mouth && MOUTHS[m.mouth](col)
    if (mouth) out.push(mouth)

    return <g>{out}</g>
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`c${uid}`}>
          <circle cx={BODY.cx} cy={BODY.cy} r={BODY.r} />
        </clipPath>
        <mask id={`lit${uid}`} maskUnits="userSpaceOnUse">
          <circle cx={BODY.cx} cy={BODY.cy} r={BODY.r} fill="#fff" />
          <circle cx={SHADOW.cx} cy={SHADOW.cy} r={SHADOW.r} fill="#000" />
        </mask>
        <mask id={`shd${uid}`} maskUnits="userSpaceOnUse">
          <circle cx={SHADOW.cx} cy={SHADOW.cy} r={SHADOW.r} fill="#fff" />
        </mask>
      </defs>

      <g transform={portrait ? PORTRAIT_TRANSFORM : `rotate(${rot} 70 80)`}>
        {!portrait && (
          <>
            <ellipse
              cx="70"
              cy="124"
              rx="32"
              ry="4.5"
              fill="rgba(27,27,58,0.09)"
            />
            <ellipse cx="54" cy="114" rx="11.5" ry="7" fill={c.light} />
            <ellipse cx="86" cy="114" rx="11.5" ry="7" fill={c.light} />
          </>
        )}
        <circle cx={BODY.cx} cy={BODY.cy} r={BODY.r} fill={c.base} />
        <g clipPath={`url(#c${uid})`}>
          <circle cx={SHADOW.cx} cy={SHADOW.cy} r={SHADOW.r} fill={c.deep} />
          {props.includes('blush') && (
            <g fill={EVE.pink} opacity="0.55">
              <ellipse cx="38" cy="76" rx="9" ry="5.5" />
              <ellipse cx="98" cy="76" rx="9" ry="5.5" />
            </g>
          )}
        </g>
        {!bare && openEyes()}
        {!bare && <g mask={`url(#lit${uid})`}>{features(EVE.ink)}</g>}
        {!bare && <g mask={`url(#shd${uid})`}>{features(c.onDark)}</g>}
      </g>

      {portraitZzz && (
        <g
          fill={c.onDark}
          fontFamily="Fredoka Variable"
          fontWeight="600"
          transform={PORTRAIT_TRANSFORM}
        >
          <text x="95" y="52" fontSize="8">
            z
          </text>
          <text x="85" y="41" fontSize="11">
            Z
          </text>
        </g>
      )}

      {props.includes('sparkles') && (
        <g>
          {star(16, 40, 6, 'a')}
          {star(124, 46, 5, 'b')}
          {star(24, 92, 4, 'c')}
        </g>
      )}
      {props.includes('sparkleSmall') && (
        <g>
          {star(20, 44, 4.5, 'a')}
          {star(120, 52, 4, 'b')}
        </g>
      )}
      {props.includes('confetti') && (
        <g>
          {star(14, 36, 5.5, 'a')}
          {star(126, 42, 5, 'b')}
          <rect
            x="30"
            y="16"
            width="6"
            height="9"
            rx="2"
            fill={EVE.pink}
            transform="rotate(-24 33 20)"
          />
          <rect
            x="104"
            y="20"
            width="6"
            height="9"
            rx="2"
            fill={EVE.base}
            transform="rotate(28 107 24)"
          />
          <rect
            x="18"
            y="72"
            width="5"
            height="8"
            rx="2"
            fill={EVE.gold}
            transform="rotate(14 20 76)"
          />
          <rect
            x="118"
            y="78"
            width="5"
            height="8"
            rx="2"
            fill={EVE.pink}
            transform="rotate(-18 120 82)"
          />
        </g>
      )}
      {props.includes('zzz') && (
        <g fill={c.prop} fontFamily="Fredoka Variable" fontWeight="600">
          <text x="106" y="34" fontSize="13">
            z
          </text>
          <text x="116" y="20" fontSize="17">
            Z
          </text>
        </g>
      )}
      {props.includes('zzzSmall') && (
        <g fill={c.prop} fontFamily="Fredoka Variable" fontWeight="600">
          <text x="110" y="30" fontSize="12">
            z
          </text>
        </g>
      )}
      {props.includes('heart') && (
        <path
          d="M118 14 q6 -7 12 0 q5 6 -12 18 q-17 -12 -12 -18 q6 -7 12 0 z"
          fill={EVE.pink}
        />
      )}
      {props.includes('waves') && (
        <g stroke={c.prop} strokeWidth="3.4" fill="none" strokeLinecap="round">
          <path d="M116 52 q7 -12 0 -24" />
          <path d="M126 58 q11 -18 0 -36" />
          <path d="M24 52 q-7 -12 0 -24" opacity="0.45" />
        </g>
      )}
      {props.includes('bubble') && (
        <g fill={c.prop}>
          <circle cx="108" cy="30" r="4" />
          <circle cx="120" cy="16" r="7.5" />
        </g>
      )}
      {props.includes('question') && (
        <g>
          <circle cx="116" cy="22" r="11" fill={c.prop} />
          <text
            x="116"
            y="27"
            fontFamily="Fredoka Variable"
            fontWeight="600"
            fontSize="14"
            fill="#fff"
            textAnchor="middle"
          >
            ?
          </text>
        </g>
      )}
      {props.includes('dots') && (
        <g fill={c.prop}>
          <circle cx="104" cy="26" r="4" />
          <circle cx="116" cy="22" r="4" opacity="0.7" />
          <circle cx="128" cy="26" r="4" opacity="0.4" />
        </g>
      )}
    </svg>
  )
}

// Zooms the body so it fills a round avatar frame, feet and props left outside.
const PORTRAIT_TRANSFORM = 'translate(-46.7 -36.7) scale(1.667)'

function arc([x, y]: Point, up: boolean, col: string, width = 4.6): ReactNode {
  return (
    <path
      key={`a${x}`}
      d={
        up
          ? `M${x - 9} ${y + 4} Q${x} ${y - 7} ${x + 9} ${y + 4}`
          : `M${x - 9} ${y - 1} Q${x} ${y + 7} ${x + 9} ${y - 1}`
      }
      stroke={col}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
    />
  )
}

const stroke = (key: string, d: string, col: string, width: number) => (
  <path
    key={key}
    d={d}
    stroke={col}
    strokeWidth={width}
    fill="none"
    strokeLinecap="round"
  />
)

const BROWS: Record<Brows | 'none', ((col: string) => ReactNode[]) | null> = {
  none: null,
  raised: (col) => [
    stroke('b1', 'M43 43 Q52 38 61 42', col, 3.4),
    stroke('b2', 'M75 42 Q84 38 93 43', col, 3.4),
  ],
  sad: (col) => [
    stroke('b1', 'M43 46 Q52 41 61 39', col, 3.4),
    stroke('b2', 'M93 46 Q84 41 75 39', col, 3.4),
  ],
  firm: (col) => [
    stroke('b1', 'M43 41 L61 45', col, 3.6),
    stroke('b2', 'M93 41 L75 45', col, 3.6),
  ],
  oneUp: (col) => [
    stroke('b1', 'M43 44 Q52 40 61 44', col, 3.4),
    stroke('b2', 'M75 40 Q84 35 93 41', col, 3.4),
  ],
}

// The mouth sits below the eyes, slightly left of the body centre.
const MX = 68
const MY = 86

const MOUTHS: Record<Mouth, (col: string) => ReactNode> = {
  smile: (col) =>
    stroke('m', `M${MX - 8} ${MY} Q${MX} ${MY + 10} ${MX + 8} ${MY}`, col, 3.6),
  grin: (col) =>
    stroke(
      'm',
      `M${MX - 11} ${MY - 1} Q${MX} ${MY + 13} ${MX + 11} ${MY - 1}`,
      col,
      3.8,
    ),
  big: (col) => (
    <path
      key="m"
      d={`M${MX - 11} ${MY} Q${MX} ${MY + 19} ${MX + 11} ${MY} Z`}
      fill={col}
    />
  ),
  soft: (col) =>
    stroke(
      'm',
      `M${MX - 7} ${MY + 1} Q${MX} ${MY + 6} ${MX + 7} ${MY + 1}`,
      col,
      3.4,
    ),
  small: (col) =>
    stroke(
      'm',
      `M${MX - 4.5} ${MY + 1} Q${MX} ${MY + 5} ${MX + 4.5} ${MY + 1}`,
      col,
      3.2,
    ),
  flat: (col) =>
    stroke('m', `M${MX - 7} ${MY + 2} L${MX + 7} ${MY + 2}`, col, 3.4),
  firm: (col) =>
    stroke(
      'm',
      `M${MX - 8} ${MY + 3} Q${MX} ${MY - 1} ${MX + 8} ${MY + 3}`,
      col,
      3.6,
    ),
  o: (col) => (
    <ellipse key="m" cx={MX} cy={MY + 3} rx="5.4" ry="6.8" fill={col} />
  ),
  wavy: (col) =>
    stroke(
      'm',
      `M${MX - 9} ${MY + 2} Q${MX - 4.5} ${MY - 2} ${MX} ${MY + 2} Q${MX + 4.5} ${MY + 6} ${MX + 9} ${MY + 2}`,
      col,
      3.4,
    ),
  frown: (col) =>
    stroke(
      'm',
      `M${MX - 7} ${MY + 6} Q${MX} ${MY - 0.5} ${MX + 7} ${MY + 6}`,
      col,
      3.5,
    ),
  yawn: (col) => (
    <ellipse key="m" cx={MX} cy={MY + 5} rx="7.5" ry="9.5" fill={col} />
  ),
}

function star(x: number, y: number, r: number, key: string): ReactNode {
  const q = r * 0.24
  return (
    <path
      key={key}
      d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z`}
      fill={EVE.gold}
    />
  )
}

// shade(hex, amt) — lighten (amt > 0) or darken (amt < 0) a hex colour,
// amt in [-1, 1]. Derives Eve's shadow and feet from her body colour.
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
  return (
    '#' +
    channels
      .map((ch) => {
        const v = amt > 0 ? ch + (255 - ch) * amt : ch * (1 + amt)
        return Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

// WCAG relative luminance, used only to pick the readable feature colour.
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const ch = Number.parseInt(h.slice(i, i + 2), 16) / 255
    return ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
