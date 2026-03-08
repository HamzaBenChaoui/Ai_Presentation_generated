import { useTheme } from '../../context/ThemeContext'
import { SLIDE_COUNTS, TONES, LANGUAGES, PRESENTATION_THEMES } from '../../constants/data'

interface Props {
  visible: boolean
  slideCount: string
  tone: string
  language: string
  selectedTheme: number
  onSlideCountChange: (v: string) => void
  onToneChange: (v: string) => void
  onLanguageChange: (v: string) => void
  onThemeChange: (index: number) => void
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const { colors } = useTheme()

  return (
    <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: colors.textMuted,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 40px 11px 14px',
            backgroundColor: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: '10px',
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            fontFamily: 'DM Sans, sans-serif',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.accent
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.glow}`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} style={{ backgroundColor: colors.surface }}>
              {opt}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <div
          style={{
            position: 'absolute',
            right: '13px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: colors.textMuted,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function StepCustomize({
  visible,
  slideCount,
  tone,
  language,
  selectedTheme,
  onSlideCountChange,
  onToneChange,
  onLanguageChange,
  onThemeChange,
}: Props) {
  const { colors } = useTheme()

  if (!visible) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Dropdowns */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <Select label="Slide count" value={slideCount} options={SLIDE_COUNTS.map(s => `${s} slides`)} onChange={(v) => onSlideCountChange(v.replace(' slides', ''))} />
        <Select label="Tone" value={tone} options={TONES} onChange={onToneChange} />
        <Select label="Language" value={language} options={LANGUAGES} onChange={onLanguageChange} />
      </div>

      {/* Theme picker */}
      <div>
        <p
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.textMuted,
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Color theme
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {PRESENTATION_THEMES.map((theme, index) => (
            <button
              key={theme.name}
              onClick={() => onThemeChange(index)}
              title={theme.name}
              style={{
                position: 'relative',
                width: '44px',
                height: '44px',
                border: selectedTheme === index
                  ? `2px solid ${colors.accent}`
                  : `2px solid transparent`,
                borderRadius: '50%',
                background: theme.gradient,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedTheme === index
                  ? `0 0 0 4px ${colors.glow}`
                  : '0 2px 8px rgba(0,0,0,0.15)',
                transform: selectedTheme === index ? 'scale(1.1)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (selectedTheme !== index) {
                  e.currentTarget.style.transform = 'scale(1.06)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTheme !== index) {
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {selectedTheme === index && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
          {/* Theme names */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              paddingLeft: '4px',
            }}
          >
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              {PRESENTATION_THEMES[selectedTheme].name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
