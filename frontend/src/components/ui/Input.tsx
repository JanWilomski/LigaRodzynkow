import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md bg-[var(--color-surface)] border px-3 py-2 text-sm',
          'text-[var(--color-foreground)] placeholder:text-[var(--color-subtle)]',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:border-[var(--color-accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border-strong)] hover:border-[var(--color-subtle)]',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
