import { useTheme } from '../../context/ThemeContext'
import StepTabs from './StepTabs'
import StepDescribe from './StepDescribe'
import StepCustomize from './StepCustomize'
import StepReview from './StepReview'
import CardFooter from './CardFooter'

interface Props {
  currentStep: number
  prompt: string
  slideCount: string
  tone: string
  language: string
  selectedTheme: number
  onStepChange: (step: number) => void
  onPromptChange: (value: string) => void
  onSlideCountChange: (value: string) => void
  onToneChange: (value: string) => void
  onLanguageChange: (value: string) => void
  onThemeChange: (index: number) => void
  onGenerate: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export default function GeneratorCard({
  currentStep,
  prompt,
  slideCount,
  tone,
  language,
  selectedTheme,
  onStepChange,
  onPromptChange,
  onSlideCountChange,
  onToneChange,
  onLanguageChange,
  onThemeChange,
  onGenerate,
  textareaRef,
}: Props) {
  const { colors } = useTheme()

  return (
    <div
      style={{
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto 88px',
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: `0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px ${colors.border}`,
        animation: 'fadeUp 0.6s ease 0.4s both',
      }}
    >
      <div style={{ padding: '28px 28px 24px' }}>
        <StepTabs currentStep={currentStep} onStepChange={onStepChange} />

        <StepDescribe
          visible={currentStep === 0}
          prompt={prompt}
          onPromptChange={onPromptChange}
          textareaRef={textareaRef}
        />

        <StepCustomize
          visible={currentStep === 1}
          slideCount={slideCount}
          tone={tone}
          language={language}
          selectedTheme={selectedTheme}
          onSlideCountChange={onSlideCountChange}
          onToneChange={onToneChange}
          onLanguageChange={onLanguageChange}
          onThemeChange={onThemeChange}
        />

        <StepReview
          visible={currentStep === 2}
          prompt={prompt}
          slideCount={slideCount}
          tone={tone}
          language={language}
          selectedTheme={selectedTheme}
        />
      </div>

      <CardFooter onGenerate={onGenerate} />
    </div>
  )
}
