import { useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { LOADING_STEPS } from '../constants/data'

interface Props {
  isGenerating: boolean
  loadingStep: number
  onCancel: () => void
  onStepChange: (step: number) => void
}

export default function GenerateOverlay({ isGenerating, loadingStep, onCancel, onStepChange }: Props) {
  const { colors, mode } = useTheme()

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      onStepChange(Math.min(loadingStep + 1, LOADING_STEPS.length - 1))
    }, 900)
    return () => clearInterval(interval)
  }, [isGenerating, loadingStep, onStepChange])

  if (!isGenerating) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        backgroundColor: mode === 'dark'
          ? 'rgba(6,6,16,0.85)'
          : 'rgba(244,245,255,0.88)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {/* Spinning Ring */}
      <div
        style={{
          position: 'relative',
          width: '72px',
          height: '72px',
          marginBottom: '36px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid ${colors.border}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid transparent`,
            borderTopColor: colors.accent,
            borderRightColor: colors.accent2,
            animation: 'spin 1.1s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '10px',
            borderRadius: '50%',
            border: `2px solid transparent`,
            borderTopColor: colors.accent3,
            animation: 'spin 0.7s linear infinite reverse',
          }}
        />
      </div>

      <h3
        style={{
          fontSize: '26px',
          fontWeight: '700',
          color: colors.text,
          marginBottom: '40px',
          fontFamily: 'Syne, sans-serif',
          letterSpacing: '-0.5px',
        }}
      >
        Crafting your slides
        <span style={{ animation: 'pulse 1.4s ease-in-out infinite', display: 'inline-block', marginLeft: '2px' }}>...</span>
      </h3>

      {/* Steps */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          width: '340px',
          padding: '28px 32px',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
        }}
      >
        {LOADING_STEPS.map((step, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              opacity: index > loadingStep ? 0 : 1,
              transform: index > loadingStep ? 'translateX(-6px)' : 'translateX(0)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* Dot */}
            <div
              style={{
                width: '9px',
                height: '9px',
                minWidth: '9px',
                borderRadius: '50%',
                backgroundColor:
                  index < loadingStep
                    ? colors.accent3
                    : index === loadingStep
                    ? colors.accent
                    : colors.textDim,
                boxShadow:
                  index === loadingStep
                    ? `0 0 0 4px ${colors.glow}`
                    : 'none',
                animation: index === loadingStep ? 'pulse 1.6s ease-in-out infinite' : 'none',
                transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: index === loadingStep ? '600' : '400',
                color:
                  index === loadingStep
                    ? colors.text
                    : index < loadingStep
                    ? colors.textMuted
                    : colors.textDim,
                transition: 'color 0.3s ease',
              }}
            >
              {step}
            </span>
            {index < loadingStep && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: colors.accent3,
                  fontWeight: '600',
                }}
              >
                Done
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          marginTop: '32px',
          padding: '11px 28px',
          backgroundColor: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          color: colors.textMuted,
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.borderActive
          e.currentTarget.style.color = colors.text
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.border
          e.currentTarget.style.color = colors.textMuted
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        Cancel
      </button>
    </div>
  )
}
