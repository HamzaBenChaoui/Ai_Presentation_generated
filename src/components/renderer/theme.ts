// Renderer design tokens. Phase 11 expands this into a full theme engine;
// for now we expose a single token set the layouts consume so swapping the
// theme later is a one-line change. All values are CSS strings so layouts
// stay framework-agnostic.

// Spec element types are defined in the shared types module but the renderer
// components import them from this module for a single source of truth.
export type { SpecElement, SlideSpec } from '../../types'

export interface RenderTokens {
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  textMuted: string
  textDim: string
  accent: string
  accent2: string
  accent3: string
  fontHeading: string
  fontBody: string
  radius: string
  radiusLg: string
}

export const defaultTokens: RenderTokens = {
  bg: '#0b0b16',
  surface: 'rgba(255,255,255,0.04)',
  surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.12)',
  text: '#f4f4ff',
  textMuted: '#a0a0c0',
  textDim: '#6b6b8a',
  accent: '#7c6aff',
  accent2: '#ff6ac1',
  accent3: '#37e0c8',
  fontHeading: "'Syne', sans-serif",
  fontBody: "'DM Sans', sans-serif",
  radius: '14px',
  radiusLg: '24px',
}

export const layoutGradient: Record<string, string> = {
  hero: 'radial-gradient(1200px 600px at 20% 10%, rgba(124,106,255,0.35), transparent 60%), linear-gradient(135deg, #14142a 0%, #0b0b16 100%)',
  'image-left': 'linear-gradient(135deg, #14142a 0%, #0b0b16 100%)',
  'image-right': 'linear-gradient(135deg, #0b0b16 0%, #14142a 100%)',
  thank_you: 'linear-gradient(135deg, #7c6aff 0%, #ff6ac1 100%)',
}

export function tokenFor(_themeName?: string | null): RenderTokens {
  // Phase 11 will map theme names to full token sets. Until then every
  // named theme reuses the default palette so the renderer never breaks.
  return defaultTokens
}
