import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md bg-[var(--color-surface)] border px-3 pr-9 py-2 text-sm',
            'text-[var(--color-foreground)]',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:border-[var(--color-accent)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-border-strong)] hover:border-[var(--color-subtle)]',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]"
          aria-hidden
        />
      </div>
    )
  },
)
Select.displayName = 'Select'
