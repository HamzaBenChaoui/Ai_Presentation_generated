import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { presentationsApi, ApiClientError } from '../lib/api'
import type { Presentation } from '../types'
import { RECENT_PRESENTATIONS } from '../constants/data'

// Fallback gradients for decks that don't carry a theme yet.
const GRADIENTS = [
  'linear-gradient(135deg, #7c6aff 0%, #a89fff 100%)',
  'linear-gradient(135deg, #0d3b66 0%, #1b6ca8 100%)',
  'linear-gradient(135deg, #1a3c34 0%, #2d6a4f 100%)',
  'linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)',
  'linear-gradient(135deg, #6a2c70 0%, #b83b5e 100%)',
]

function gradientFor(p: Presentation, index: number): string {
  if (p.theme) return p.theme
  return GRADIENTS[index % GRADIENTS.length]
}

function formatTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString()
}

export default function RecentPresentations() {
  const { colors } = useTheme()
  const { isAuthenticated } = useAuth()

  const [items, setItems] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create / rename modal state.
  const [modal, setModal] = useState<null | { mode: 'create' | 'rename'; id?: string; initialTitle?: string }>(null)
  const [titleInput, setTitleInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await presentationsApi.list()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load presentations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) void load()
    else setItems([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const openCreate = () => {
    setTitleInput('')
    setModal({ mode: 'create' })
  }

  const openRename = (p: Presentation) => {
    setTitleInput(p.title)
    setModal({ mode: 'rename', id: p.id })
  }

  const submitModal = async () => {
    const title = titleInput.trim()
    if (!title) return
    setSaving(true)
    try {
      if (modal?.mode === 'create') {
        await presentationsApi.create(title)
      } else if (modal?.id) {
        await presentationsApi.rename(modal.id, title)
      }
      setModal(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    setError(null)
    try {
      await presentationsApi.duplicate(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Duplicate failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this presentation? This cannot be undone.')) return
    setError(null)
    try {
      await presentationsApi.remove(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed')
    }
  }

  // Signed-out: keep the static marketing showcase.
  const showcase = !isAuthenticated ? RECENT_PRESENTATIONS : items

  return (
    <section style={{ maxWidth: '1180px', margin: '0 auto 88px', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: colors.text, margin: 0, letterSpacing: '-0.4px' }}>
          Recent presentations
        </h2>
        {isAuthenticated && (
          <button
            onClick={openCreate}
            style={{ fontSize: '14px', fontWeight: '600', textDecoration: 'none', color: '#fff', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, border: 'none', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            + New presentation
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '13px', color: '#ff6b81', backgroundColor: 'rgba(255,75,97,0.1)', border: `1px solid rgba(255,75,97,0.3)`, borderRadius: '10px', padding: '10px 12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '14px', color: colors.textMuted }}>Loading your presentations…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {showcase.map((entry, index) => {
            const p = entry as Presentation
            const gradient = isAuthenticated ? gradientFor(p, index) : (entry as { gradient: string }).gradient
            const title = p.title
            const slides = p.slide_count ?? 0
            const time = isAuthenticated ? formatTime(p.updated_at) : (entry as { time: string }).time
            return (
              <div
                key={p.id ?? index}
                style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.22s ease', position: 'relative' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = colors.borderActive; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.18)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Thumbnail */}
                <div style={{ height: '110px', background: gradient, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 12px', gap: '5px' }}>
                    <div style={{ height: '3px', width: '60%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                    <div style={{ height: '2px', width: '90%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                    <div style={{ height: '2px', width: '75%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                  </div>

                  {/* Owner-only action menu */}
                  {isAuthenticated && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <ActionButton label="Rename" colors={colors} onClick={() => openRename(p)}>✎</ActionButton>
                      <ActionButton label="Duplicate" colors={colors} onClick={() => handleDuplicate(p.id)}>⧉</ActionButton>
                      <ActionButton label="Delete" colors={colors} onClick={() => handleDelete(p.id)}>🗑</ActionButton>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 8px 0', lineHeight: '1.35' }}>{title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: colors.textMuted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                      {slides} slides
                    </span>
                    <span>{time}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* New presentation card (create) */}
          {isAuthenticated && (
            <div
              onClick={openCreate}
              style={{ border: `2px dashed ${colors.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '190px', cursor: 'pointer', transition: 'all 0.22s ease', backgroundColor: 'transparent', gap: '10px' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.backgroundColor = `${colors.accent}08`; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.surface2, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '22px', fontWeight: '300' }}>+</div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textMuted }}>New presentation</span>
            </div>
          )}
        </div>
      )}

      {/* Create / Rename modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6,6,16,0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '28px', color: '#eeeeff', fontFamily: 'DM Sans, sans-serif' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'Syne, sans-serif', margin: '0 0 16px' }}>
              {modal.mode === 'create' ? 'New presentation' : 'Rename presentation'}
            </h2>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b6b8a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</label>
            <input
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submitModal() }}
              placeholder="e.g. Q3 Business Review"
              style={{ width: '100%', padding: '11px 14px', backgroundColor: '#17172a', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#eeeeff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#6b6b8a', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => void submitModal()}
                disabled={saving || !titleInput.trim()}
                style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c6aff, #ff6ac1)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: saving || !titleInput.trim() ? 0.6 : 1 }}
              >
                {saving ? 'Please wait…' : modal.mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ActionButton({ label, colors, onClick, children }: { label: string; colors: { surface2: string; border: string; textMuted: string }; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(15,15,26,0.7)', border: `1px solid rgba(255,255,255,0.12)`, color: '#eeeeff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15,15,26,0.95)'; e.currentTarget.style.borderColor = colors.border }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15,15,26,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
    >
      {children}
    </button>
  )
}
