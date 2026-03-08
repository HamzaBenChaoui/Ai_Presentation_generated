import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors'
import type { ThemeMode, ColorPalette } from '../types'

interface ThemeContextValue {
  mode: ThemeMode
  colors: ColorPalette
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: DARK_COLORS,
  toggle: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS

  const toggle = () => setMode(prev => (prev === 'dark' ? 'light' : 'dark'))

  // Apply bg to <html> for full-page coverage
  useEffect(() => {
    document.documentElement.style.background = colors.bg
    document.body.style.background = colors.bg
    document.body.style.color = colors.text
  }, [colors])

  return (
    <ThemeContext.Provider value={{ mode, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
