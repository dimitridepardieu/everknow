import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { apiFetch } from './api'
import type { Profile } from './schemas'
import { profileSchema, profilesSchema } from './schemas'

export const profilesQueryOptions = queryOptions({
  queryKey: ['profiles'] as const,
  queryFn: async (): Promise<Profile[]> => {
    const data = await apiFetch<unknown>('/api/profiles')
    return profilesSchema.parse(data)
  },
  staleTime: 60_000,
})

export function useProfiles() {
  return useQuery(profilesQueryOptions)
}

interface CreateProfileInput {
  name: string
  age?: number
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProfileInput): Promise<Profile> => {
      const data = await apiFetch<unknown>('/api/profiles', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return profileSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions.queryKey })
    },
  })
}
