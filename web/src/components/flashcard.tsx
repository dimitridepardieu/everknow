import { cn } from '@/lib/utils'

// One card, face up or face down, with a couple of siblings peeking out from
// under it. Omit `answer` and the card stays on its question — the only state
// training has that reviewing a fresh batch does not.
//
// `labelled` names the two halves. Training drops the labels: a child there is
// recalling, and the layout already says which half is which. Card creation
// keeps them, because a parent is checking what the model wrote and the labels
// are what tells the two screens apart.
export function Flashcard({
  question,
  answer,
  labelled = false,
  tone = 'neutral',
}: {
  readonly question: string
  readonly answer?: string
  readonly labelled?: boolean
  readonly tone?: 'neutral' | 'success'
}) {
  return (
    <div className="relative w-full">
      {/* stacked cards behind, for depth (decorative). inset-0 makes them
          match the card's own height, so the rotation is what peeks out — a
          fixed height would hide them under it. */}
      <div className="absolute inset-0 rotate-[-2.5deg] rounded-3xl bg-white opacity-55 shadow-[0_3px_0_var(--border)]" />
      <div className="absolute inset-0 rotate-[1.8deg] rounded-3xl bg-white opacity-80 shadow-[0_3px_0_var(--border)]" />

      <div
        className={cn(
          'relative rounded-3xl p-6 transition-colors',
          tone === 'success'
            ? 'bg-success-soft shadow-[0_4px_0_var(--border),inset_0_0_0_3px_var(--success)]'
            : 'bg-white shadow-[0_4px_0_var(--border),inset_0_0_0_2px_var(--primary-soft)]',
        )}
      >
        {labelled && (
          <p className="font-heading text-ink-muted mb-2 text-xs font-semibold tracking-[1px] uppercase">
            Question
          </p>
        )}
        <p className="font-heading text-ink text-[24px] leading-snug font-semibold">
          {question}
        </p>

        {answer !== undefined && (
          <>
            <div className="my-5 border-t-2 border-dashed border-[var(--border)]" />
            {labelled && (
              <p className="font-heading text-primary mb-2 text-xs font-semibold tracking-[1px] uppercase">
                Réponse
              </p>
            )}
            <p className="text-ink text-[19px] leading-relaxed font-bold">
              {answer}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
