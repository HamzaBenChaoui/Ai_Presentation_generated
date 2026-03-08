export type ThemeMode = 'dark' | 'light'

export interface ColorPalette {
  bg: string
  surface: string
  surface2: string
  surface3: string
  border: string
  borderActive: string
  text: string
  textMuted: string
  textDim: string
  accent: string
  accent2: string
  accent3: string
  glow: string
  glowPink: string
  glowTeal: string
  navBg: string
}

export interface QuickStart {
  label: string
  prompt: string
}

export interface PresentationTheme {
  name: string
  gradient: string
}

export interface RecentPresentation {
  title: string
  gradient: string
  slides: number
  time: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface AppState {
  currentStep: number
  prompt: string
  slideCount: string
  tone: string
  language: string
  selectedTheme: number
  isGenerating: boolean
  loadingStep: number
}
