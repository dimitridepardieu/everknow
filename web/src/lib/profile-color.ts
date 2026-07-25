// Profiles carry no stored colour yet, so a profile is tinted by its position
// in the family list. Stable while the list is (ordered by created_at, no
// deletion yet) — revisit when profiles can be removed or reordered.
const AVATAR_COLORS = ['#FFD86A', '#FF8FB1', '#4FC1F0', '#7AD9C8', '#C5A8FF']

export function profileColor(index: number): string {
  // Clamp so a "not found" index (findIndex returns -1) falls back to the first
  // colour rather than reading AVATAR_COLORS[-1]; callers pass a raw index.
  return AVATAR_COLORS[Math.max(0, index) % AVATAR_COLORS.length]
}
