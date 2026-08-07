import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { publicSharesApi, ApiClientError } from '../lib/api'
import type { PresentationSpec } from '../types'
import PresentationRenderer from '../components/renderer/PresentationRenderer'
import { DeckThemeProvider } from '../components/renderer/DeckThemeContext'
import type { ThemeName } from '../components/renderer/theme'
import { Lock } from 'lucide-react'

interface Props {
  token: string
  password?: string
}

export default function SharedView({ token, password: initialPassword }: Props) {
  const { colors } = useTheme()
  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [activePassword, setActivePassword] = useState<string | undefined>(initialPassword)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    publicSharesApi
      .get(token, activePassword)
      .then(data => {
        setSpec(data.spec)
        setTitle(data.title)
        setNeedsPassword(false)
      })
      .catch(err => {
        const status = err instanceof ApiClientError ? err.status : 0
        if (status === 403) {
          setNeedsPassword(true)
          setError(null)
        } else {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load shared presentation')
          setNeedsPassword(false)
        }
      })
      .finally(() => setLoading(false))
  }, [token, activePassword])

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

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim()) return
    setActivePassword(passwordInput)
    setLoading(true)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: colors.surface, color: colors.textMuted }}>
        Loading...
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: colors.surface }}>
        <form
          onSubmit={submitPassword}
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '32px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: colors.text }}>Password required</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>This share link is protected.</div>
            </div>
          </div>
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '11px 14px',
              backgroundColor: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={!passwordInput.trim()}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '10px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: passwordInput.trim() ? 'pointer' : 'default',
              opacity: passwordInput.trim() ? 1 : 0.5,
            }}
          >
            Unlock
          </button>
        </form>
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
