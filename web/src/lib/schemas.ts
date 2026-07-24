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
// reviews these — accept / edit / reject — before the kept ones land in a deck.
export const generatedCardSchema = z.object({
  question: z.string(),
  answer: z.string(),
})
export type GeneratedCard = z.infer<typeof generatedCardSchema>

export const generateResultSchema = z.object({
  cards: z.array(generatedCardSchema),
})
export type GenerateResult = z.infer<typeof generateResultSchema>

// A saved paquet, as returned by the save endpoint.
export const deckSchema = z.object({
  id: z.number(),
  name: z.string(),
})
export type Deck = z.infer<typeof deckSchema>

// The paquet name the parent types on the review screen. Messages live here so
// the field reads them off the parse; the ceiling mirrors the API's rune bound.
export const deckNameSchema = z
  .string()
  .trim()
  .min(1, 'Donne un nom à ton paquet.')
  .max(100, 'Ce nom est trop long.')

// Mirrors the API's rune bounds (deck/handlers.go). The floor keeps a paid
// generation from firing on a scrap of text; the ceiling matches the model
// budget. Messages live here so the paste screen reads them off the parse.
export const sourceTextSchema = z
  .string()
  .trim()
  .min(100, 'Colle un peu plus de texte pour de bonnes cartes.')
  .max(5000, 'Ce texte est trop long. Garde l’essentiel.')

// A card the active learner has to answer now. The answer travels with the
// question: the child reveals it and grades themselves against it.
export const dueCardSchema = z.object({
  id: z.number(),
  question: z.string(),
  answer: z.string(),
  rank: z.number(),
})
export type DueCard = z.infer<typeof dueCardSchema>

export const dueCardsSchema = z.object({
  cards: z.array(dueCardSchema),
})

// Where a card landed after being answered. A null due_at means mastered —
// that, not the rank number, is what says the card never comes back.
export const reviewResultSchema = z.object({
  rank: z.number(),
  due_at: z.string().nullable(),
})
export type ReviewResult = z.infer<typeof reviewResultSchema>
