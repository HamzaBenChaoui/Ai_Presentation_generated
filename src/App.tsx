import { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import BackgroundBlobs from './components/BackgroundBlobs'
import GenerateOverlay from './components/GenerateOverlay'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import GeneratorCard from './components/GeneratorCard/GeneratorCard'
import RecentPresentations from './components/RecentPresentations'
import FilesPanel from './components/FilesPanel'
import FeaturesStrip from './components/FeaturesStrip'

function AppContent() {
  const [currentStep, setCurrentStep] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState('10')
  const [tone, setTone] = useState('Professional')
  const [language, setLanguage] = useState('English')
  const [selectedTheme, setSelectedTheme] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const link1 = document.createElement('link')
    link1.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap'
    link1.rel = 'stylesheet'
    document.head.appendChild(link1)
    const link2 = document.createElement('link')
    link2.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
    link2.rel = 'stylesheet'
    document.head.appendChild(link2)
    return () => {
      if (document.head.contains(link1)) document.head.removeChild(link1)
      if (document.head.contains(link2)) document.head.removeChild(link2)
    }
  }, [])

  const handleGenerate = () => {
    if (!prompt.trim()) {
      if (textareaRef.current) {
        textareaRef.current.style.borderColor = '#ff4757'
        textareaRef.current.focus()
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.style.borderColor = ''
        }, 2000)
      }
      return
    }
    setIsGenerating(true)
    setLoadingStep(0)
  }

  const handleCancel = () => {
    setIsGenerating(false)
    setLoadingStep(0)
  }

  return (
    <>
      <BackgroundBlobs />
      <GenerateOverlay
        isGenerating={isGenerating}
        loadingStep={loadingStep}
        onCancel={handleCancel}
        onStepChange={setLoadingStep}
      />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />
        <main style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <HeroSection />
          <GeneratorCard
            currentStep={currentStep}
            prompt={prompt}
            slideCount={slideCount}
            tone={tone}
            language={language}
            selectedTheme={selectedTheme}
            onStepChange={setCurrentStep}
            onPromptChange={setPrompt}
            onSlideCountChange={setSlideCount}
            onToneChange={setTone}
            onLanguageChange={setLanguage}
            onThemeChange={setSelectedTheme}
            onGenerate={handleGenerate}
            textareaRef={textareaRef}
          />
          <RecentPresentations />
          <FilesPanel />
          <FeaturesStrip />
        </main>
      </div>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
        <AppContent />
      </div>
    </ThemeProvider>
  )
}
