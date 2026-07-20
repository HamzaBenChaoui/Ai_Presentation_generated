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

export interface Presentation {
  id: string
  owner_id: string
  title: string
  description: string | null
  slide_count: number
  status: string
  theme: string | null
  created_at: string
  updated_at: string
}

export interface PresentationList {
  items: Presentation[]
  total: number
}

export interface FileAsset {
  id: string
  owner_id: string
  filename: string
  storage_path: string
  content_type: string | null
  size_bytes: number
  created_at: string
}

export interface FileList {
  items: FileAsset[]
  total: number
}
