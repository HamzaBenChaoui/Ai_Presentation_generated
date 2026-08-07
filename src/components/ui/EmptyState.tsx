import { type ReactNode, type ComponentType } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      {Icon && (
        <div className="rounded-full bg-surface2 p-3 text-text-dim">
          <Icon size={32} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
