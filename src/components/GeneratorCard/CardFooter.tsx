import { useTheme } from '../../context/ThemeContext'

interface Props {
  onGenerate: () => void
}

const ICON_BUTTONS = [
  {
    label: 'Upload',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    label: 'Templates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default function CardFooter({ onGenerate }: Props) {
  const { colors } = useTheme()

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Icon buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {ICON_BUTTONS.map((item) => (
          <button
            key={item.label}
            title={item.label}
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
              cursor: 'pointer',
              color: colors.textMuted,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface3
              e.currentTarget.style.borderColor = colors.borderActive
              e.currentTarget.style.color = colors.text
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface2
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textMuted
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Generate CTA */}
      <button
        onClick={onGenerate}
        style={{
          padding: '11px 24px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
          border: 'none',
          borderRadius: '10px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: `0 4px 20px ${colors.glow}`,
          transition: 'all 0.22s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = `0 8px 28px ${colors.glow}`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = `0 4px 20px ${colors.glow}`
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Generate Presentation
      </button>
    </div>
  )
}
