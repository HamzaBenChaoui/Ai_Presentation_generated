// App chrome theme (light/dark) — completely independent from the DECK
// theme (deck tokens live in components/renderer/theme.ts).
//
// Implementation: Tailwind v4 utilities read the --color-* variables defined
// in index.css; dark mode simply overrides them under `html.dark`. This
// provider persists the choice and toggles the class on <html>.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ColorPalette } from '../types'

type AppThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  resolved: AppThemeMode
  colors: ColorPalette
  toggle: () => void
  setMode: (mode: AppThemeMode) => void
}

const WARM_LIGHT: ColorPalette = {
  bg: '#fdfaf6',
  surface: '#ffffff',
  surface2: '#faf5f0',
  surface3: '#f5efe8',
  border: '#e7e0d6',
  borderActive: '#d6cdc0',
  text: '#1c1917',
  textMuted: '#78716c',
  textDim: '#a8a29e',
  accent: '#ea580c',
  accent2: '#f59e0b',
  accent3: '#ea580c',
  glow: 'rgba(234,88,12,0.15)',
  glowPink: 'rgba(245,158,11,0.12)',
  glowTeal: 'rgba(34,197,94,0.12)',
  navBg: 'rgba(253,250,246,0.82)',
}

const WARM_DARK: ColorPalette = {
  bg: '#131016',
  surface: '#1b181f',
  surface2: '#221e28',
  surface3: '#2a2531',
  border: '#35303d',
  borderActive: '#4a4456',
  text: '#f4f1ee',
  textMuted: '#aaa39c',
  textDim: '#7c756d',
  accent: '#f97316',
  accent2: '#fbbf24',
  accent3: '#f97316',
  glow: 'rgba(249,115,22,0.18)',
  glowPink: 'rgba(251,191,36,0.14)',
  glowTeal: 'rgba(34,197,94,0.14)',
  navBg: 'rgba(19,16,22,0.82)',
}

const STORAGE_KEY = 'slideai.app-theme'

const ThemeContext = createContext<ThemeContextValue>({
  resolved: 'light',
  colors: WARM_LIGHT,
  toggle: () => {},
  setMode: () => {},
})

export const useTheme = () => useContext(ThemeContext)

function readInitialMode(): AppThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* ignore */ }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>(readInitialMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch { /* ignore */ }
  }, [mode])

  const setMode = (next: AppThemeMode) => setModeState(next)
  const toggle = () => setModeState((m) => (m === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider
      value={{ resolved: mode, colors: mode === 'dark' ? WARM_DARK : WARM_LIGHT, toggle, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
