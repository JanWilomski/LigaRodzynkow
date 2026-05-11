import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:brightness-110 active:brightness-95 disabled:opacity-50',
  secondary:
    'bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] hover:border-[var(--color-subtle)] disabled:opacity-50',
  ghost:
    'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:opacity-50',
  danger:
    'bg-transparent text-[var(--color-danger)] border border-[var(--color-border)] hover:bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] hover:border-[var(--color-danger)] disabled:opacity-50',
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
