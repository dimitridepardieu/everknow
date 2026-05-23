import { createFileRoute, useSearch } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth-form'
import { authSearchSchema } from '@/lib/schemas'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  component: RegisterPage,
})

function RegisterPage() {
  const { error } = useSearch({ from: '/register' })
  return <AuthForm mode="register" errorCode={error} />
}
