import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'default' | 'accent' | 'danger' | 'success'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface2 text-text-muted',
  accent: 'bg-accent/15 text-accent',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
