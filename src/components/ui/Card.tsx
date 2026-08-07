import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className, hoverable = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4',
        hoverable && 'transition-shadow duration-200 hover:shadow-lg hover:shadow-surface3',
        className,
      )}
    >
      {children}
    </div>
  )
}
