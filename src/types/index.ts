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
  access_role?: string | null
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

// --- Phase 7: Presentation Specification (structured, not HTML) ---

export type LayoutName =
  | 'hero' | 'title' | 'agenda' | 'section' | 'timeline'
  | 'comparison' | 'cards' | 'statistics' | 'pricing' | 'gallery'
  | 'process' | 'flow' | 'roadmap' | 'team' | 'quote' | 'swot'
  | 'table' | 'chart' | 'image-left' | 'image-right' | 'cta'
  | 'conclusion' | 'thank-you'
  // AI free-coded slide: slide.code carries real HTML/CSS/JS rendered in a
  // sandboxed iframe (see CustomCodeFrame). Everything else is ignored.
  | 'custom'

// Free-coded slide payload. The AI writes real code; the renderer hosts it in
// a sandboxed iframe with theme tokens + Chart.js/anime.js preloaded.
export interface CustomSlideCode {
  html?: string
  css?: string
  js?: string
}

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
  // Only used when layout === 'custom': the AI-authored code for this slide.
  code?: CustomSlideCode | null
}

// An AI-authored custom animation. The model defines a named keyframe set the
// renderer can apply to elements via `element.animation = "<name>"`. Everything
// is validated with a real CSS parser before it reaches the DOM; invalid defs
// are dropped silently and the element falls back to a built-in animation.
export interface CustomAnimationDef {
  name: string
  // Raw "@keyframes <name> { ... }" rule (or just the body). Only transform,
  // opacity and filter are allowed inside.
  keyframes: string
  // Animation length in milliseconds (validated: 100–2000ms).
  duration: number
  // Timing function — a cubic-bezier(...), steps(...) or non-linear keyword.
  easing?: string
}

export interface PresentationMeta {
  title: string
  theme?: string | null
  background?: string | null
  language: string
  tone: string
  customAnimations?: CustomAnimationDef[] | null
}

export interface PresentationSpec {
  meta: PresentationMeta
  slides: SlideSpec[]
}

// --- Chat ---

export type ChatRole = 'user' | 'assistant'

export interface ToolCallInfo {
  name: string
  arguments: Record<string, any>
}

export interface ToolStep {
  name: string
  arguments: Record<string, any>
  status: 'running' | 'success' | 'error'
  summary?: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  tool_calls?: ToolCallInfo[] | null
  tool_steps?: ToolStep[] | null
  created_at: string
}

export interface ChatListResponse {
  messages: ChatMessage[]
  total: number
  /** Caller's effective role: owner | admin | editor | viewer | null */
  access_role?: string | null
}
