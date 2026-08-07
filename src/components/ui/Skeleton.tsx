import { cn } from '../../lib/cn'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = 8,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-surface2 rounded', className)}
      style={{
        width,
        height,
        borderRadius,
        backgroundSize: '200% 100%',
      }}
    />
  )
}
