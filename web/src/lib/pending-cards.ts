import { z } from 'zod'

import type { GeneratedCard } from './schemas'
import { generatedCardSchema } from './schemas'

// The generated cards, handed from /create to /create/review across a route
// change. sessionStorage, not localStorage: a review in progress should die
// with the tab, not resurrect three weeks later. Read/written synchronously
// like active-profile — no useEffect, the write is driven by the event.
const STORAGE_KEY = 'fa_pending_cards'

export function writePendingCards(cards: readonly GeneratedCard[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

export function readPendingCards(): GeneratedCard[] | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed = z.array(generatedCardSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function clearPendingCards(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
