import { z } from 'zod'

export const emailSchema = z
  .string()
  .min(1, 'Email requis')
  .email("Format d'email invalide")

export const roleSchema = z.enum(['parent', 'student'])
export type Role = z.infer<typeof roleSchema>

export const meSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  role: roleSchema.nullable(),
})
export type Me = z.infer<typeof meSchema>
