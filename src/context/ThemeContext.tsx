import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { ColorPalette } from '../types'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  resolved: 'dark' | 'light'
  colors: ColorPalette
  toggle: () => void
  setMode: (mode: ThemeMode) => void
}

const WARM_DARK: ColorPalette = {
  bg: '#1c1917',
  surface: '#292524',
  surface2: '#3a3530',
  surface3: '#44403c',
  border: '#57534e',
  borderActive: '#78716c',
  text: '#fafaf9',
  textMuted: '#a8a29e',
  textDim: '#78716c',
  accent: '#fb923c',
  accent2: '#fbbf24',
  accent3: '#fb923c',
  glow: 'rgba(251,146,60,0.2)',
  glowPink: 'rgba(251,191,36,0.15)',
  glowTeal: 'rgba(34,197,94,0.15)',
  navBg: 'rgba(28,25,23,0.8)',
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

const STORAGE_KEY = 'slideai.theme'

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch { /* ignore */ }
  return 'system'
}

function getSystemResolved(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolved: 'dark',
  colors: WARM_DARK,
  toggle: () => {},
  setMode: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)
  const [systemDark, setSystemDark] = useState(getSystemResolved)

  const resolved = mode === 'system' ? systemDark : mode

  const colors = resolved === 'dark' ? WARM_DARK : WARM_LIGHT

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  // Sync bg/color on body for legacy components
  useEffect(() => {
    document.documentElement.style.background = colors.bg
    document.body.style.background = colors.bg
    document.body.style.color = colors.text
  }, [colors])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem(STORAGE_KEY, m) } catch { /* ignore */ }
  }, [])

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setMode])

  return (
    <ThemeContext.Provider value={{ mode, resolved, colors, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
