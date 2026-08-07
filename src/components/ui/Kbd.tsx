import { cn } from '../../lib/cn'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded border border-border bg-surface2 px-1.5 py-0.5',
        'font-mono text-xs text-text-muted',
        'select-none',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
