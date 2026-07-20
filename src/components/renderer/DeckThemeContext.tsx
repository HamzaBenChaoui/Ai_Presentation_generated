import { createContext, useContext, useState, type ReactNode } from 'react'
import { tokenFor, type ThemeName } from './theme'

interface DeckThemeValue {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  tokens: ReturnType<typeof tokenFor>
}

const DeckThemeContext = createContext<DeckThemeValue | null>(null)

export function DeckThemeProvider({
  initial,
  children,
}: {
  initial?: ThemeName | null
  children: ReactNode
}) {
  const [theme, setTheme] = useState<ThemeName>((initial as ThemeName) || 'modern')
  return (
    <DeckThemeContext.Provider value={{ theme, setTheme, tokens: tokenFor(theme) }}>
      {children}
    </DeckThemeContext.Provider>
  )
}

export function useDeckTheme(): DeckThemeValue {
  const ctx = useContext(DeckThemeContext)
  if (!ctx) return { theme: 'modern', setTheme: () => {}, tokens: tokenFor('modern') }
  return ctx
}
