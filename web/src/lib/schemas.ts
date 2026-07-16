import { z } from 'zod'

export const emailSchema = z.email("Format d'email invalide")

export const roleSchema = z.enum(['family', 'individual'])
export type Role = z.infer<typeof roleSchema>

export const meSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  role: roleSchema.nullable(),
})
export type Me = z.infer<typeof meSchema>

export const profileSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  age: z.number().nullable(),
})
export type Profile = z.infer<typeof profileSchema>

export const profilesSchema = z.array(profileSchema)

// Shared by /login and /register: an `?error=<code>` query string carries
// failure reasons from the magic-link verify redirect.
export const authSearchSchema = z.object({
  error: z.string().optional(),
})
