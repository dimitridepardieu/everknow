import { createFileRoute, useSearch } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth-form'
import { authSearchSchema } from '@/lib/schemas'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: LoginPage,
})

function LoginPage() {
  const { error } = useSearch({ from: '/login' })
  return <AuthForm mode="login" errorCode={error} />
}
