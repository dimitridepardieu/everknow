import { createFileRoute, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthForm } from './login'

const searchSchema = z.object({
  error: z.string().optional(),
})

export const Route = createFileRoute('/register')({
  validateSearch: searchSchema,
  component: RegisterPage,
})

function RegisterPage() {
  const { error } = useSearch({ from: '/register' })
  return <AuthForm mode="register" errorCode={error} />
}
