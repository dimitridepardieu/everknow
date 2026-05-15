import { createFileRoute, useSearch } from '@tanstack/react-router'

import { authSearchSchema } from '@/lib/schemas'

import { AuthForm } from './login'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  component: RegisterPage,
})

function RegisterPage() {
  const { error } = useSearch({ from: '/register' })
  return <AuthForm mode="register" errorCode={error} />
}
