// Profiles carry no stored colour yet, so a profile is tinted by its position
// in the family list. Stable while the list is (ordered by created_at, no
// deletion yet) — revisit when profiles can be removed or reordered.
const AVATAR_COLORS = ['#FFD86A', '#FF8FB1', '#4FC1F0', '#7AD9C8', '#C5A8FF']

export function profileColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}
