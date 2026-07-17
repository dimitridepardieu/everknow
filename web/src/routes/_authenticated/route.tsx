import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { ActiveProfileProvider } from '@/lib/active-profile'
import { meQueryOptions } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  // Auth guard only: bounce to /login if there's no session. The user data
  // itself is read via useMe() in child components so it stays fresh after
  // mutations (no stale router-context snapshot to fight against).
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (!me) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <ActiveProfileProvider>
      <Outlet />
    </ActiveProfileProvider>
  )
}
