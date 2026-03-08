import { useTheme } from '../context/ThemeContext'

export default function BackgroundBlobs() {
  const { colors, mode } = useTheme()

  if (mode === 'light') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '-8%',
            right: '-6%',
            width: '38vw',
            height: '38vw',
            background: 'radial-gradient(circle, rgba(108,88,245,0.18) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'drift 20s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-8%',
            width: '40vw',
            height: '40vw',
            background: 'radial-gradient(circle, rgba(232,85,168,0.14) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'drift 24s ease-in-out infinite alternate-reverse',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '55%',
            width: '28vw',
            height: '28vw',
            background: 'radial-gradient(circle, rgba(18,200,154,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'drift 18s ease-in-out infinite alternate',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* Purple blob — top right */}
      <div
        style={{
          position: 'absolute',
          top: '-12%',
          right: '-8%',
          width: '42vw',
          height: '42vw',
          background: colors.accent,
          borderRadius: '50%',
          filter: 'blur(130px)',
          opacity: 0.18,
          animation: 'drift 20s ease-in-out infinite alternate',
        }}
      />
      {/* Pink blob — bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '45vw',
          height: '45vw',
          background: colors.accent2,
          borderRadius: '50%',
          filter: 'blur(130px)',
          opacity: 0.13,
          animation: 'drift 26s ease-in-out infinite alternate-reverse',
        }}
      />
      {/* Teal blob — center */}
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '54%',
          width: '30vw',
          height: '30vw',
          background: colors.accent3,
          borderRadius: '50%',
          filter: 'blur(110px)',
          opacity: 0.09,
          animation: 'drift 22s ease-in-out infinite alternate',
        }}
      />
      {/* Noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }}
      />
    </div>
  )
}
