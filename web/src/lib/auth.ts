import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { ApiError, apiFetch } from './api'
import type { Me, Role } from './schemas'
import { meSchema } from './schemas'

export const meQueryOptions = queryOptions({
  queryKey: ['me'] as const,
  queryFn: async (): Promise<Me | null> => {
    try {
      const data = await apiFetch<unknown>('/api/me')
      return meSchema.parse(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null
      }
      throw err
    }
  },
  staleTime: 60_000,
  retry: false,
})

export function useMe() {
  return useQuery(meQueryOptions)
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ status: string }>('/api/auth/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (role: Role) =>
      apiFetch<void>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: async () => {
      // Invalidate both the Query cache AND the Router context: the latter
      // holds `me` from _app's beforeLoad, which would otherwise stay stale
      // and make _app.learn's role-check redirect us back to /onboarding.
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
      await router.invalidate()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(meQueryOptions.queryKey, null)
    },
  })
}
