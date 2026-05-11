import { getAvatarColor, getInitials, cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ring-1 ring-inset ring-white/10',
        sizeClasses[size],
        className,
      )}
      style={{ background: getAvatarColor(name) }}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  )
}
