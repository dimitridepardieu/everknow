import { Clock } from 'lucide-react'

import { Eve } from '@/components/eve'
import { Sparkle } from '@/components/sparkle'

// Eve perched on a paper envelope. Fixed at 180px; positions are pixel-tuned,
// so inline styles (clip-path, gradients) are clearer here than utilities.
//
// `cold` is the expired-link variant: the same envelope with the warmth pulled
// out of it, a clock where the stamp was, and no sparkles. One illustration
// family for the two ends of a magic link, rather than two unrelated drawings.
export function EveEnvelope({ cold }: { readonly cold?: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
      {/* envelope */}
      <div
        className="absolute bottom-1.5 left-1/2 overflow-hidden rounded-lg shadow-[0_6px_0_var(--border),inset_0_0_0_2px_var(--border)]"
        style={{
          width: 140,
          height: 99,
          background: cold ? '#FBF7EF' : '#FFFFFF',
          transform: 'translateX(-50%) rotate(-4deg)',
        }}
      >
        {/* flap */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: '60%',
            background: cold
              ? 'linear-gradient(180deg, #EFE9DD 0%, #DFD8C8 100%)'
              : 'linear-gradient(180deg, #F4EFE5 0%, #E6E0D0 100%)',
            clipPath: 'polygon(0 0, 100% 0, 50% 80%)',
          }}
        />
        {/* address lines */}
        <div className="absolute inset-x-4 bottom-3 flex flex-col gap-1">
          <div className="bg-border h-[3px] w-[70%] rounded-full" />
          <div className="bg-border h-[3px] w-[50%] rounded-full" />
        </div>
      </div>

      {cold ? (
        /* clock, where the stamp sits on the warm version */
        <div
          className="absolute right-2.5 bottom-4 flex items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_2px_var(--input),0_3px_0_rgba(27,27,58,0.08)]"
          style={{ width: 38, height: 38, transform: 'rotate(8deg)' }}
        >
          <Clock className="text-ink-soft size-5" strokeWidth={2.6} />
        </div>
      ) : (
        <>
          {/* stamp */}
          <div
            className="bg-gold absolute right-3 bottom-5 flex items-center justify-center shadow-[0_2px_0_var(--gold-dark)]"
            style={{ width: 30, height: 36, transform: 'rotate(8deg)' }}
          >
            <Sparkle size={18} className="text-white" />
          </div>

          {/* floating sparkles */}
          <Sparkle size={14} className="text-gold absolute top-0 left-2" />
          <Sparkle size={12} className="text-pink absolute top-3.5 right-0" />
          <Sparkle size={10} className="text-primary absolute top-12 left-0" />
        </>
      )}

      {/* Eve on top */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
        <Eve size={108} mood={cold ? 'soft.concerned' : 'soft.cheer'} />
      </div>
    </div>
  )
}
