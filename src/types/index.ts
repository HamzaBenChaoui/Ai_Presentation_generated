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

export interface Slide {
  index: number
  title: string
  bullets: string[]
  notes: string | null
  layout: string
}

// --- Phase 7: Presentation Specification (structured, not HTML) ---

export type LayoutName =
  | 'hero' | 'title' | 'agenda' | 'section' | 'timeline'
  | 'comparison' | 'cards' | 'statistics' | 'pricing' | 'gallery'
  | 'process' | 'flow' | 'roadmap' | 'team' | 'quote' | 'swot'
  | 'table' | 'chart' | 'image-left' | 'image-right' | 'cta'
  | 'conclusion' | 'thank-you'

export type ElementType =
  | 'title' | 'subtitle' | 'paragraph' | 'bullets' | 'image'
  | 'cards' | 'timeline' | 'comparison' | 'quote' | 'statistics'
  | 'code' | 'table' | 'diagram' | 'icon'

export interface SpecElement {
  id?: string | null
  type: ElementType
  animation?: string | null
  text?: string
  level?: number
  items?: any[]
  src?: string | null
  alt?: string
  caption?: string | null
  language?: string
  code?: string
  author?: string
  headers?: string[]
  rows?: any[][]
  kind?: string
  label?: string | null
  name?: string
  left?: Record<string, any>
  right?: Record<string, any>
}

export interface SlideSpec {
  layout: LayoutName
  background?: string | null
  theme?: string | null
  notes?: string | null
  elements: SpecElement[]
}

export interface PresentationMeta {
  title: string
  theme?: string | null
  background?: string | null
  language: string
  tone: string
}

export interface PresentationSpec {
  meta: PresentationMeta
  slides: SlideSpec[]
}
