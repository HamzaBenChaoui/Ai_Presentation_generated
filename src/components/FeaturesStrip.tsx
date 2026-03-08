import { useTheme } from '../context/ThemeContext'

const FEATURES = [
  {
    title: 'Instant Generation',
    description: 'Full deck in under 30 seconds',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    accentIndex: 0,
  },
  {
    title: 'Beautiful Themes',
    description: '5 curated styles, fully customizable',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 20c-2.8 0-6-1.3-6-6.5 0-1.5.5-3 2-4 1 2 2.5 3.5 5 3.5 1.3 0 1.65-.42 2.7-1 .31-.17.65-.3 1-.3 2 0 2.3 2.3 2.3 2.3C20.5 15 20 16 20 16c0 2.5-1.5 4-3 4z" />
      </svg>
    ),
    accentIndex: 1,
  },
  {
    title: 'Fully Editable',
    description: 'Every slide is yours to tweak',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    accentIndex: 2,
  },
  {
    title: 'Export Anywhere',
    description: 'PPTX, PDF, or live share link',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    accentIndex: 0,
  },
]

export default function FeaturesStrip() {
  const { colors } = useTheme()

  const accentColors = [colors.accent, colors.accent2, colors.accent3]
  const glowColors = [colors.glow, colors.glowPink, colors.glowTeal]

  return (
    <section
      style={{
        maxWidth: '1180px',
        margin: '0 auto 100px',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {FEATURES.map((feature, index) => {
          const accent = accentColors[feature.accentIndex]
          const glow = glowColors[feature.accentIndex]
          return (
            <div
              key={feature.title}
              style={{
                padding: '28px 24px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                transition: 'all 0.22s ease',
                animationDelay: `${index * 0.07}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${accent}40`
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 12px 40px ${glow}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: `${accent}18`,
                  border: `1px solid ${accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent,
                  marginBottom: '18px',
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'Syne, sans-serif',
                  color: colors.text,
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.2px',
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: colors.textMuted,
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
