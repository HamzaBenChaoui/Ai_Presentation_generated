// Phase 11 — Theme Engine.
//
// A real design system: each theme is a full token set covering color,
// typography, spacing, radius, buttons, cards and accents. Layouts consume
// tokens so switching a theme re-skins the entire deck instantly. Spec
// element types live in ../types but are re-exported here for convenience.

export type { SpecElement, SlideSpec } from '../../types'

// --- token shape ------------------------------------------------------------

export interface RenderTokens {
  // color
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
  // typography
  fontHeading: string
  fontBody: string
  // shape
  radius: string
  radiusLg: string
  // gradients / accents
  gradient: string
  // card + button presets (kept as ready CSS snippets)
  cardShadow: string
  buttonRadius: string
}

// --- design-system primitives ----------------------------------------------

export const fonts = {
  display: "'Syne', 'Space Grotesk', sans-serif",
  grotesk: "'Space Grotesk', sans-serif",
  sans: "'DM Sans', 'Inter', sans-serif",
  serif: "'Lora', 'Georgia', serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  apple: "'SF Pro Display', '-apple-system', 'Helvetica Neue', sans-serif",
  google: "'Product Sans', 'Roboto', sans-serif",
  microsoft: "'Segoe UI', 'Fluent', sans-serif",
}

// --- the 15 themes ----------------------------------------------------------

export type ThemeName =
  | 'modern' | 'corporate' | 'startup' | 'education' | 'medical'
  | 'finance' | 'luxury' | 'minimal' | 'glass' | 'dark'
  | 'neon' | 'apple' | 'google' | 'microsoft' | 'openai'

interface ThemeDef {
  label: string
  tokens: RenderTokens
}

const themes: Record<ThemeName, ThemeDef> = {
  modern: {
    label: 'Modern',
    tokens: {
      bg: '#0b0b16', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
      border: 'rgba(255,255,255,0.12)', text: '#f4f4ff', textMuted: '#a0a0c0', textDim: '#6b6b8a',
      accent: '#7c6aff', accent2: '#ff6ac1', accent3: '#37e0c8',
      fontHeading: fonts.display, fontBody: fonts.sans,
      radius: '14px', radiusLg: '24px', gradient: 'linear-gradient(135deg, #7c6aff, #ff6ac1)',
      cardShadow: '0 20px 50px rgba(0,0,0,0.35)', buttonRadius: '40px',
    },
  },
  corporate: {
    label: 'Corporate',
    tokens: {
      bg: '#0f172a', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.08)',
      border: 'rgba(148,163,184,0.25)', text: '#e8edf5', textMuted: '#94a3b8', textDim: '#64748b',
      accent: '#2563eb', accent2: '#0ea5e9', accent3: '#38bdf8',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '10px', radiusLg: '18px', gradient: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
      cardShadow: '0 16px 40px rgba(15,23,42,0.4)', buttonRadius: '8px',
    },
  },
  startup: {
    label: 'Startup',
    tokens: {
      bg: '#0c0a14', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.09)',
      border: 'rgba(255,255,255,0.12)', text: '#fdfdfd', textMuted: '#b6b6cf', textDim: '#7c7c98',
      accent: '#ff7a45', accent2: '#ffd23f', accent3: '#22d3a6',
      fontHeading: fonts.display, fontBody: fonts.sans,
      radius: '16px', radiusLg: '28px', gradient: 'linear-gradient(135deg, #ff7a45, #ffd23f)',
      cardShadow: '0 24px 60px rgba(0,0,0,0.4)', buttonRadius: '999px',
    },
  },
  education: {
    label: 'Education',
    tokens: {
      bg: '#102a2e', surface: 'rgba(255,255,255,0.06)', surface2: 'rgba(255,255,255,0.1)',
      border: 'rgba(255,255,255,0.16)', text: '#f3fbf6', textMuted: '#9fd3c0', textDim: '#6fa893',
      accent: '#16a34a', accent2: '#22c55e', accent3: '#f59e0b',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '14px', radiusLg: '22px', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)',
      cardShadow: '0 18px 44px rgba(0,0,0,0.3)', buttonRadius: '12px',
    },
  },
  medical: {
    label: 'Medical',
    tokens: {
      bg: '#0a1f2e', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.08)',
      border: 'rgba(125,211,252,0.22)', text: '#eaf6ff', textMuted: '#9ec5e0', textDim: '#6a94ad',
      accent: '#0ea5e9', accent2: '#14b8a6', accent3: '#38bdf8',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '12px', radiusLg: '20px', gradient: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
      cardShadow: '0 16px 40px rgba(0,0,0,0.3)', buttonRadius: '10px',
    },
  },
  finance: {
    label: 'Finance',
    tokens: {
      bg: '#0b1220', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
      border: 'rgba(212,175,55,0.22)', text: '#f5f7fa', textMuted: '#a7b0bd', textDim: '#6b7280',
      accent: '#1e7d5a', accent2: '#d4af37', accent3: '#34d399',
      fontHeading: fonts.serif, fontBody: fonts.sans,
      radius: '10px', radiusLg: '16px', gradient: 'linear-gradient(135deg, #1e7d5a, #d4af37)',
      cardShadow: '0 18px 46px rgba(0,0,0,0.4)', buttonRadius: '8px',
    },
  },
  luxury: {
    label: 'Luxury',
    tokens: {
      bg: '#14110d', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.06)',
      border: 'rgba(201,162,92,0.3)', text: '#f6efdf', textMuted: '#c2b48f', textDim: '#8a7c5c',
      accent: '#c9a25c', accent2: '#e8c98a', accent3: '#d4af37',
      fontHeading: fonts.serif, fontBody: fonts.sans,
      radius: '8px', radiusLg: '14px', gradient: 'linear-gradient(135deg, #c9a25c, #e8c98a)',
      cardShadow: '0 24px 60px rgba(0,0,0,0.5)', buttonRadius: '6px',
    },
  },
  minimal: {
    label: 'Minimal',
    tokens: {
      bg: '#ffffff', surface: 'rgba(0,0,0,0.03)', surface2: 'rgba(0,0,0,0.05)',
      border: 'rgba(0,0,0,0.1)', text: '#111111', textMuted: '#555555', textDim: '#999999',
      accent: '#111111', accent2: '#666666', accent3: '#2563eb',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '10px', radiusLg: '18px', gradient: 'linear-gradient(135deg, #111111, #666666)',
      cardShadow: '0 10px 30px rgba(0,0,0,0.08)', buttonRadius: '8px',
    },
  },
  glass: {
    label: 'Glass',
    tokens: {
      bg: 'rgba(15,18,40,0.6)', surface: 'rgba(255,255,255,0.08)', surface2: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.18)', text: '#f4f5ff', textMuted: '#b9bce0', textDim: '#8083a8',
      accent: '#9b7bff', accent2: '#57e6ff', accent3: '#ff8fd6',
      fontHeading: fonts.display, fontBody: fonts.sans,
      radius: '18px', radiusLg: '28px', gradient: 'linear-gradient(135deg, #9b7bff, #57e6ff)',
      cardShadow: '0 20px 50px rgba(0,0,0,0.45)', buttonRadius: '14px',
    },
  },
  dark: {
    label: 'Dark',
    tokens: {
      bg: '#000000', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.09)',
      border: 'rgba(255,255,255,0.14)', text: '#ffffff', textMuted: '#a1a1aa', textDim: '#52525b',
      accent: '#ffffff', accent2: '#a1a1aa', accent3: '#3b82f6',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '12px', radiusLg: '20px', gradient: 'linear-gradient(135deg, #ffffff, #a1a1aa)',
      cardShadow: '0 20px 50px rgba(0,0,0,0.6)', buttonRadius: '10px',
    },
  },
  neon: {
    label: 'Neon',
    tokens: {
      bg: '#06000f', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
      border: 'rgba(255,0,200,0.3)', text: '#f0e9ff', textMuted: '#b78bff', textDim: '#7c5cae',
      accent: '#ff00c8', accent2: '#00f0ff', accent3: '#aaff00',
      fontHeading: fonts.display, fontBody: fonts.sans,
      radius: '12px', radiusLg: '22px', gradient: 'linear-gradient(135deg, #ff00c8, #00f0ff)',
      cardShadow: '0 0 40px rgba(255,0,200,0.25)', buttonRadius: '12px',
    },
  },
  apple: {
    label: 'Apple',
    tokens: {
      bg: '#fbfbfd', surface: 'rgba(0,0,0,0.03)', surface2: 'rgba(0,0,0,0.05)',
      border: 'rgba(0,0,0,0.1)', text: '#1d1d1f', textMuted: '#6e6e73', textDim: '#a1a1a6',
      accent: '#0071e3', accent2: '#42a5f5', accent3: '#34c759',
      fontHeading: fonts.apple, fontBody: fonts.apple,
      radius: '14px', radiusLg: '22px', gradient: 'linear-gradient(135deg, #0071e3, #42a5f5)',
      cardShadow: '0 12px 36px rgba(0,0,0,0.1)', buttonRadius: '999px',
    },
  },
  google: {
    label: 'Google',
    tokens: {
      bg: '#ffffff', surface: 'rgba(0,0,0,0.03)', surface2: 'rgba(0,0,0,0.05)',
      border: 'rgba(0,0,0,0.1)', text: '#202124', textMuted: '#5f6368', textDim: '#9aa0a6',
      accent: '#4285f4', accent2: '#ea4335', accent3: '#34a853',
      fontHeading: fonts.google, fontBody: fonts.google,
      radius: '12px', radiusLg: '20px', gradient: 'linear-gradient(135deg, #4285f4, #ea4335)',
      cardShadow: '0 10px 30px rgba(0,0,0,0.1)', buttonRadius: '999px',
    },
  },
  microsoft: {
    label: 'Microsoft',
    tokens: {
      bg: '#f3f2f1', surface: 'rgba(0,0,0,0.03)', surface2: 'rgba(0,0,0,0.05)',
      border: 'rgba(0,0,0,0.12)', text: '#201f1e', textMuted: '#605e5c', textDim: '#8a8886',
      accent: '#0078d4', accent2: '#d83b01', accent3: '#107c10',
      fontHeading: fonts.microsoft, fontBody: fonts.microsoft,
      radius: '8px', radiusLg: '14px', gradient: 'linear-gradient(135deg, #0078d4, #d83b01)',
      cardShadow: '0 10px 28px rgba(0,0,0,0.12)', buttonRadius: '6px',
    },
  },
  openai: {
    label: 'OpenAI',
    tokens: {
      bg: '#0d0d0d', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
      border: 'rgba(255,255,255,0.12)', text: '#ececf1', textMuted: '#9b9ba6', textDim: '#6b6b76',
      accent: '#10a37f', accent2: '#1fb890', accent3: '#19c37d',
      fontHeading: fonts.grotesk, fontBody: fonts.sans,
      radius: '12px', radiusLg: '20px', gradient: 'linear-gradient(135deg, #10a37f, #1fb890)',
      cardShadow: '0 20px 50px rgba(0,0,0,0.5)', buttonRadius: '10px',
    },
  },
}

export const defaultTokens: RenderTokens = themes.modern.tokens

export const themeNames: ThemeName[] = Object.keys(themes) as ThemeName[]
export const themeLabels: Record<ThemeName, string> = Object.fromEntries(
  themeNames.map((n) => [n, themes[n].label]),
) as Record<ThemeName, string>

// Map a (possibly null/legacy) theme name to a full token set. Unknown or
// missing names fall back to the Modern theme so the renderer never breaks.
export function tokenFor(themeName?: string | null): RenderTokens {
  if (themeName && themeName in themes) return themes[themeName as ThemeName].tokens
  return defaultTokens
}

export function themeLabel(themeName?: string | null): string {
  if (themeName && themeName in themes) return themes[themeName as ThemeName].label
  return themes.modern.label
}

// Background gradients per layout, used when a slide has no explicit bg.
export const layoutGradient: Record<string, string> = {
  hero: 'radial-gradient(1200px 600px at 20% 10%, rgba(124,106,255,0.35), transparent 60%), linear-gradient(135deg, #14142a 0%, #0b0b16 100%)',
  'image-left': 'linear-gradient(135deg, #14142a 0%, #0b0b16 100%)',
  'image-right': 'linear-gradient(135deg, #0b0b16 0%, #14142a 100%)',
  thank_you: 'linear-gradient(135deg, #7c6aff 0%, #ff6ac1 100%)',
}
