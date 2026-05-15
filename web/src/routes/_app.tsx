import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { meQueryOptions } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (!me) {
      throw redirect({ to: '/login' })
    }
    return { me }
  },
  component: AppLayout,
})

function AppLayout() {
  return <Outlet />
}
