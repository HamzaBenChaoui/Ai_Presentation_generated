import { useTheme } from '../../context/ThemeContext'
import { PRESENTATION_THEMES } from '../../constants/data'

interface Props {
  visible: boolean
  prompt: string
  slideCount: string
  tone: string
  language: string
  selectedTheme: number
}

export default function StepReview({ visible, prompt, slideCount, tone, language, selectedTheme }: Props) {
  const { colors } = useTheme()

  if (!visible) return null

  const theme = PRESENTATION_THEMES[selectedTheme]

  if (!prompt.trim()) {
    return (
      <div
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          animation: 'fadeUp 0.35s ease both',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: colors.surface2,
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.textDim} strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Go back to <strong style={{ color: colors.text }}>Describe</strong> and add your presentation topic first.
        </p>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Prompt preview */}
      <div
        style={{
          padding: '18px',
          backgroundColor: colors.surface2,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          marginBottom: '20px',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}
        >
          Your topic
        </p>
        <p
          style={{
            fontSize: '14px',
            color: colors.text,
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          {prompt}
        </p>
      </div>

      {/* Settings grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          { label: 'Slides', value: slideCount },
          { label: 'Tone', value: tone },
          { label: 'Language', value: language },
          {
            label: 'Theme',
            value: theme.name,
            gradient: theme.gradient,
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '14px',
              backgroundColor: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 6px 0',
              }}
            >
              {item.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.gradient && (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: item.gradient,
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                }}
              >
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ready indicator */}
      <div
        style={{
          marginTop: '20px',
          padding: '14px 18px',
          backgroundColor: `${colors.accent}12`,
          border: `1px solid ${colors.accent}30`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: colors.accent3,
            boxShadow: `0 0 8px ${colors.glowTeal}`,
            animation: 'pulse 2s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
          Everything looks good — click <strong style={{ color: colors.text }}>Generate</strong> to create your presentation.
        </p>
      </div>
    </div>
  )
}
