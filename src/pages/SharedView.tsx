import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { publicSharesApi, ApiClientError } from '../lib/api'
import type { PresentationSpec } from '../types'
import PresentationRenderer from '../components/renderer/PresentationRenderer'
import { DeckThemeProvider } from '../components/renderer/DeckThemeContext'
import type { ThemeName } from '../components/renderer/theme'

interface Props {
  token: string
  password?: string
}

export default function SharedView({ token, password }: Props) {
  const { colors } = useTheme()
  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!token) return
    publicSharesApi
      .get(token, password)
      .then(data => {
        setSpec(data.spec)
        setTitle(data.title)
      })
      .catch(err => {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load shared presentation')
      })
      .finally(() => setLoading(false))
  }, [token, password])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setIndex(i => Math.min(i + 1, Math.max(0, (spec?.slides.length || 1) - 1)))
      }
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spec])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: colors.surface, color: colors.textMuted }}>
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: colors.surface, color: '#ff6b81' }}>
        {error}
      </div>
    )
  }

  if (!spec) return null

  const total = spec.slides.length
  const slide = spec.slides[index]
  if (!slide) return null

  return (
    <DeckThemeProvider initial={(spec.meta?.theme as ThemeName) || 'modern'}>
      <div style={{ minHeight: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text }}>{title}</span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>Shared via Slide AI</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: '960px' }}>
            <PresentationRenderer spec={{ meta: spec.meta, slides: [slide] }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', color: index === 0 ? colors.textDim : colors.text, cursor: index === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Prev
          </button>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>{index + 1} / {total}</span>
          <button
            onClick={() => setIndex(i => Math.min(i + 1, total - 1))}
            disabled={index >= total - 1}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', color: index >= total - 1 ? colors.textDim : colors.text, cursor: index >= total - 1 ? 'default' : 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Next
          </button>
        </div>
      </div>
    </DeckThemeProvider>
  )
}
