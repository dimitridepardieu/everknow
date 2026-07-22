import { useMutation } from '@tanstack/react-query'

import { apiFetch } from './api'
import type { GenerateResult } from './schemas'
import { generateResultSchema } from './schemas'

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
