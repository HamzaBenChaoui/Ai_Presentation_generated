import { useTheme } from '../../context/ThemeContext'

interface Props {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export default function Skeleton({ width = '100%', height = '16px', borderRadius = 8 }: Props) {
  const { colors } = useTheme()
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${colors.surface2} 25%, ${colors.border} 50%, ${colors.surface2} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      }}
    />
  )
}
