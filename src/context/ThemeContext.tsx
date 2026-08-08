import { createContext, useContext, type ReactNode } from 'react'
import type { ColorPalette } from '../types'

interface ThemeContextValue {
  resolved: 'light'
  colors: ColorPalette
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

const ThemeContext = createContext<ThemeContextValue>({
  resolved: 'light',
  colors: WARM_LIGHT,
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ resolved: 'light', colors: WARM_LIGHT }}>
      {children}
    </ThemeContext.Provider>
  )
}
