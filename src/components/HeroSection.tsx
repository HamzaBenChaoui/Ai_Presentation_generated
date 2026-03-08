import { useTheme } from '../context/ThemeContext'

export default function HeroSection() {
  const { colors } = useTheme()

  return (
    <section
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '88px 24px 56px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '100px',
          fontSize: '13px',
          fontWeight: '500',
          color: colors.textMuted,
          marginBottom: '28px',
          animation: 'fadeUp 0.7s ease 0.1s both',
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.accent,
            display: 'inline-block',
            boxShadow: `0 0 8px ${colors.glow}`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        AI-Powered Presentation Generator
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>

      {/* Headline */}
      <h1
        style={{
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: '800',
          fontFamily: 'Syne, sans-serif',
          lineHeight: '1.08',
          letterSpacing: '-1.5px',
          color: colors.text,
          marginBottom: '22px',
          animation: 'fadeUp 0.7s ease 0.2s both',
          maxWidth: '700px',
        }}
      >
        Turn your ideas into{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #a89fff 0%, #ff8cd6 50%, #6affd4 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline',
          }}
        >
          stunning slides
        </span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 'clamp(16px, 2vw, 18px)',
          color: colors.textMuted,
          lineHeight: '1.7',
          maxWidth: '520px',
          margin: '0 auto',
          animation: 'fadeUp 0.7s ease 0.3s both',
        }}
      >
        Describe your topic and let AI craft a professional, beautiful presentation
        in seconds — ready to present or export.
      </p>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          marginTop: '40px',
          animation: 'fadeUp 0.7s ease 0.45s both',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { value: '50K+', label: 'Presentations created' },
          { value: '< 30s', label: 'Average generation time' },
          { value: '4.9 / 5', label: 'User satisfaction' },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: '700',
                fontFamily: 'Syne, sans-serif',
                color: colors.text,
                letterSpacing: '-0.5px',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
