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

// A flashcard the AI generated from pasted text, not yet saved. The parent
// reviews these before any land in a deck (#42 owns the save).
export const generatedCardSchema = z.object({
  question: z.string(),
  answer: z.string(),
  category: z.string(),
})
export type GeneratedCard = z.infer<typeof generatedCardSchema>

export const generateResultSchema = z.object({
  cards: z.array(generatedCardSchema),
})
export type GenerateResult = z.infer<typeof generateResultSchema>

// Mirrors the API's rune bounds (deck/handlers.go). The floor keeps a paid
// generation from firing on a scrap of text; the ceiling matches the model
// budget. Messages live here so the paste screen reads them off the parse.
export const sourceTextSchema = z
  .string()
  .trim()
  .min(100, 'Colle un peu plus de texte pour de bonnes cartes.')
  .max(5000, 'Ce texte est trop long. Garde l’essentiel.')
