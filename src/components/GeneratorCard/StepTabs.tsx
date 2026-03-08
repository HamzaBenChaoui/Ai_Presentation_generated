import { useTheme } from '../../context/ThemeContext'

interface Props {
  currentStep: number
  onStepChange: (step: number) => void
}

const STEPS = ['Describe', 'Customize', 'Review']

export default function StepTabs({ currentStep, onStepChange }: Props) {
  const { colors } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '28px',
        backgroundColor: colors.surface2,
        borderRadius: '10px',
        padding: '4px',
      }}
    >
      {STEPS.map((step, index) => (
        <button
          key={step}
          onClick={() => onStepChange(index)}
          style={{
            flex: 1,
            padding: '9px 12px',
            backgroundColor: currentStep === index ? colors.surface : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: currentStep === index ? colors.text : colors.textMuted,
            fontSize: '14px',
            fontWeight: currentStep === index ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentStep === index ? `0 2px 8px rgba(0,0,0,0.12)` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
          }}
          onMouseEnter={(e) => {
            if (currentStep !== index) {
              e.currentTarget.style.color = colors.text
            }
          }}
          onMouseLeave={(e) => {
            if (currentStep !== index) {
              e.currentTarget.style.color = colors.textMuted
            }
          }}
        >
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                currentStep === index
                  ? colors.accent
                  : index < currentStep
                  ? colors.accent3
                  : colors.textDim,
              color: currentStep === index || index < currentStep ? '#fff' : colors.textMuted,
              transition: 'background-color 0.2s ease',
              flexShrink: 0,
            }}
          >
            {index < currentStep ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          {step}
        </button>
      ))}
    </div>
  )
}
