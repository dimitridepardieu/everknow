import { cn } from '@/lib/utils'

// What a field says when its own value is wrong — as opposed to a toast, which
// reports a request that failed. This one stays for as long as the value does,
// so it sits under the field it belongs to.
//
// role="alert" because these screens keep their submit button pressable: the
// refusal is the only thing that happens on press, and without it a screen
// reader is told nothing at all. Give it an `id` and point the field's
// aria-describedby at it, so the message is also reachable from the field.
export function FieldError({
  id,
  className,
  children,
}: {
  readonly id?: string
  readonly className?: string
  readonly children: React.ReactNode
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'text-destructive-dark flex items-start gap-[7px] text-[13px] leading-[1.4] font-extrabold',
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-destructive-dark mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-black text-white"
      >
        !
      </span>
      {children}
    </p>
  )
}
