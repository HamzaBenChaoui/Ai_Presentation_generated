import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { filesApi, ApiClientError } from '../lib/api'
import type { FileAsset } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

export default function FilesPanel() {
  const { colors } = useTheme()
  const { isAuthenticated } = useAuth()

  const [items, setItems] = useState<FileAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await filesApi.list()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) void load()
    else setItems([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(fileList)) {
        await filesApi.upload(file)
      }
      if (fileInput.current) fileInput.current.value = ''
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      await filesApi.remove(id)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed')
    }
  }

  if (!isAuthenticated) return null

  return (
    <section style={{ maxWidth: '1180px', margin: '0 auto 88px', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: colors.text, margin: 0, letterSpacing: '-0.4px' }}>
          My files
        </h2>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          style={{ fontSize: '14px', fontWeight: '600', color: '#fff', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, border: 'none', borderRadius: '10px', padding: '9px 16px', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1, transition: 'all 0.2s ease' }}
        >
          {uploading ? 'Uploading…' : '+ Upload file'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div style={{ fontSize: '13px', color: '#ff6b81', backgroundColor: 'rgba(255,75,97,0.1)', border: '1px solid rgba(255,75,97,0.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '14px', color: colors.textMuted }}>Loading your files…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: '14px', color: colors.textMuted, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
          No files yet. Upload images, PDFs, or documents to use in your presentations.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((f) => (
            <div
              key={f.id}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px' }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: colors.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent, fontSize: '16px', flexShrink: 0 }}>
                📄
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.filename}</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>
                  {formatSize(f.size_bytes)} · {formatTime(f.created_at)}
                </div>
              </div>
              <button
                onClick={() => void handleDelete(f.id)}
                title="Delete"
                style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '15px', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b81'; e.currentTarget.style.borderColor = 'rgba(255,75,97,0.4)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
