import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'

import { apiFetch } from './api'
import type { DueCard, GenerateResult, ReviewResult } from './schemas'
import {
  dueCardsSchema,
  generateResultSchema,
  reviewResultSchema,
} from './schemas'

// A mutation, not a query: generation is a POST triggered by the parent
// pasting text, not cached data. The result is transient — shown once, then
// handed to review — so there's nothing to invalidate.
export function useGenerateFlashcards() {
  return useMutation({
    mutationFn: async (text: string): Promise<GenerateResult> => {
      const data = await apiFetch<unknown>('/api/cards/generate', {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      return generateResultSchema.parse(data)
    },
  })
}

export const dueCardsQueryOptions = (profileId: number | undefined) =>
  queryOptions({
    queryKey: ['cards', 'due', profileId] as const,
    queryFn: async (): Promise<DueCard[]> => {
      const data = await apiFetch<unknown>(
        `/api/cards/due?profile_id=${String(profileId)}`,
      )
      return dueCardsSchema.parse(data).cards
    },
    enabled: profileId !== undefined,
  })

export function useDueCards(profileId: number | undefined) {
  return useQuery(dueCardsQueryOptions(profileId))
}

interface ReviewInput {
  cardId: number
  correct: boolean
}

// Nothing is invalidated here: a session works off the pile it was handed and
// must not shrink under the child mid-session. The count on /learn refetches
// on its own when they come back to it.
export function useReviewCard() {
  return useMutation({
    mutationFn: async ({
      cardId,
      correct,
    }: ReviewInput): Promise<ReviewResult> => {
      const data = await apiFetch<unknown>(`/api/cards/${String(cardId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ correct }),
      })
      return reviewResultSchema.parse(data)
    },
  })
}
