import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

/** The small tinted tile that sits beside every onboarding section heading. */
export function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--cc-rust-soft)] text-[color:var(--cc-rust)]">
      <Icon className="h-4 w-4" />
    </span>
  );
}

/** A piece of the person's own data — a role, a skill, a city. Sentence case
 *  and body type, because it is content to read, not a label to scan. */
export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cc-hair-strong)] bg-white/70 py-1 pl-3 text-[13px] leading-5 text-[color:var(--cc-ink)] ' +
        (onRemove ? 'pr-1.5' : 'pr-3')
      }
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === 'string' ? children : 'item'}`}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)]"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
