import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { meSchema } from '@/lib/schemas'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.status === 401) {
      throw redirect({ to: '/login' })
    }
    if (!res.ok) {
      throw new Error(`Failed to load session: ${res.status}`)
    }
    return { me: meSchema.parse(await res.json()) }
  },
  component: AppLayout,
})

function AppLayout() {
  return <Outlet />
}
