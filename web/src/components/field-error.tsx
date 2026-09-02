import { cn } from '@/lib/utils'

// What a field says when its own value is wrong — as opposed to a toast, which
// reports a request that failed. This one stays for as long as the value does,
// so it sits under the field it belongs to.
export function FieldError({
  className,
  children,
}: {
  readonly className?: string
  readonly children: React.ReactNode
}) {
  return (
    <p
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
