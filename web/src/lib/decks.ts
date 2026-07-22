import { useMutation } from '@tanstack/react-query'

import { apiFetch } from './api'
import type { Deck, GeneratedCard } from './schemas'
import { deckSchema } from './schemas'

interface SaveDeckInput {
  profileId: number
  name: string
  cards: readonly GeneratedCard[]
}

// Persist the reviewed cards as a new paquet under the active profile. There's
// no deck list in the app yet, so nothing to invalidate — a plain mutation.
// The list query (and "add to an existing paquet") lands with #58.
export function useSaveDeck() {
  return useMutation({
    mutationFn: async ({
      profileId,
      name,
      cards,
    }: SaveDeckInput): Promise<Deck> => {
      const data = await apiFetch<unknown>('/api/decks', {
        method: 'POST',
        body: JSON.stringify({ profile_id: profileId, name, cards }),
      })
      return deckSchema.parse(data)
    },
  })
}
