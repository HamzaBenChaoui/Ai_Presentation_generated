import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { tokenFor, type ThemeName } from './theme'

interface DeckThemeValue {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  tokens: ReturnType<typeof tokenFor>
  /** Raw token overrides in play (user-saved theme), null for built-ins. */
  overrides: Partial<ReturnType<typeof tokenFor>> | null
}

const DeckThemeContext = createContext<DeckThemeValue | null>(null)

export function DeckThemeProvider({
  initial,
  tokenOverrides,
  children,
}: {
  initial?: ThemeName | null
  /** Full/partial token set carried by the deck (meta.themeTokens). */
  tokenOverrides?: Record<string, unknown> | null
  children: ReactNode
}) {
  const [theme, setThemeState] = useState<ThemeName>((initial as ThemeName) || 'modern')
  useEffect(() => { if (initial) setThemeState(initial as ThemeName) }, [initial])

  // Built-in switcher wins over any carried overrides; picking a deck-carried
  // user theme name (u_*) keeps them.
  const setTheme = (t: ThemeName) => {
    setUserOverrides(null)
    setThemeState(t)
  }
  const [userOverrides, setUserOverrides] = useState<Record<string, unknown> | null>(tokenOverrides ?? null)
  useEffect(() => { setUserOverrides(tokenOverrides ?? null) }, [tokenOverrides])

  const base = tokenFor(theme)
  const tokens = userOverrides ? { ...base, ...(userOverrides as object) } as ReturnType<typeof tokenFor> : base

  return (
    <DeckThemeContext.Provider value={{ theme, setTheme, tokens, overrides: userOverrides as ReturnType<typeof tokenFor> | null }}>
      {children}
    </DeckThemeContext.Provider>
  )
}

export function useDeckTheme(): DeckThemeValue {
  const ctx = useContext(DeckThemeContext)
  if (!ctx) return { theme: 'modern', setTheme: () => {}, tokens: tokenFor('modern'), overrides: null }
  return ctx
}
