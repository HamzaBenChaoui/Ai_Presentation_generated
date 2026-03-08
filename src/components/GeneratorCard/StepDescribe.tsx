import { useTheme } from '../../context/ThemeContext'
import { QUICK_STARTS } from '../../constants/data'

interface Props {
  visible: boolean
  prompt: string
  onPromptChange: (value: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

const MAX_CHARS = 1000

export default function StepDescribe({ visible, prompt, onPromptChange, textareaRef }: Props) {
  const { colors } = useTheme()
  const pct = Math.min(prompt.length / MAX_CHARS, 1)

  if (!visible) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Textarea wrapper */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder={`Describe your presentation…\n\nExample: "A 10-slide investor pitch for a climate-tech startup focused on carbon capture technology, targeting Series A investors."`}
          rows={5}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: '12px',
            color: colors.text,
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            fontFamily: 'DM Sans, sans-serif',
            minHeight: '130px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.accent
            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.glow}`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        {/* Character counter with progress ring */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="10" cy="10" r="8" fill="none" stroke={colors.border} strokeWidth="2.5" />
            <circle
              cx="10" cy="10" r="8"
              fill="none"
              stroke={pct > 0.85 ? '#ff4757' : colors.accent}
              strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 8}`}
              strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.2s ease' }}
            />
          </svg>
          <span style={{ fontSize: '11px', color: colors.textDim }}>
            {prompt.length}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Quick starts */}
      <div>
        <p
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.textMuted,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Quick starts
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {QUICK_STARTS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                onPromptChange(item.prompt)
                textareaRef.current?.focus()
              }}
              style={{
                padding: '7px 14px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '100px',
                color: colors.textMuted,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface3
                e.currentTarget.style.borderColor = colors.accent
                e.currentTarget.style.color = colors.text
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.glow}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.color = colors.textMuted
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
