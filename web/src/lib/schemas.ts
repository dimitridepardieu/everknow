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

// Age on the create-profile form: optional, but a whole number 0–150 when
// present. Mirrors the DB CHECK. Messages live here (like emailSchema) so the
// form reads them off the parse result rather than hardcoding copy.
export const profileAgeSchema = z.coerce
  .number("Indique l'âge en années.")
  .int("Indique l'âge en années, sans virgule.")
  .min(0, 'Indique un âge en années.')
  .max(150, 'Indique un âge en années.')

// Shared by /login and /register: an `?error=<code>` query string carries
// failure reasons from the magic-link verify redirect.
export const authSearchSchema = z.object({
  error: z.string().optional(),
})
