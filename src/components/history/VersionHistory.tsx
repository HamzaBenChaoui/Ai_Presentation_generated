import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useEditor } from '../editor/EditorContext'
import { versionsApi, type VersionInfo } from '../../lib/api'

interface Props {
  presentationId: string
}

export default function VersionHistory({ presentationId }: Props) {
  const { colors } = useTheme()
  const { applyAiEdit } = useEditor()
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await versionsApi.list(presentationId)
      setVersions(result.versions)
    } catch {
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId)
    try {
      const spec = await versionsApi.restore(presentationId, versionId)
      applyAiEdit(spec)
    } catch {
      // error handled silently
    } finally {
      setRestoring(null)
      loadVersions()
    }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {loading && (
        <div style={{ color: colors.textMuted, fontSize: '12px', padding: 8 }}>Loading history...</div>
      )}
      {!loading && versions.length === 0 && (
        <div style={{ color: colors.textMuted, fontSize: '12px', padding: 8 }}>No versions yet.</div>
      )}
      {versions.map(v => (
        <div
          key={v.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
              {v.version_note || 'Auto-save'}
            </div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>
              {v.slide_count} slides &middot; {formatTime(v.created_at)}
            </div>
          </div>
          <button
            onClick={() => handleRestore(v.id)}
            disabled={restoring !== null}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${colors.accent}`,
              background: 'transparent',
              color: colors.accent,
              cursor: restoring !== null ? 'default' : 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              opacity: restoring !== null ? 0.5 : 1,
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            {restoring === v.id ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      ))}
    </div>
  )
}
