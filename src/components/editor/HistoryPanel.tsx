import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Clock, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { versionsApi, type VersionInfo } from '../../lib/api'
import type { PresentationSpec } from '../../types'

interface Props {
  presentationId: string
  onRestore: (spec: PresentationSpec) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function HistoryPanel({ presentationId, onRestore }: Props) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await versionsApi.list(presentationId)
      setVersions(res.versions.filter((v): v is VersionInfo => v != null))
    } catch {
      // silently fail
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
      const res = await versionsApi.restore(presentationId, versionId)
      onRestore(res)
      await loadVersions()
    } catch (err) {
      // could show toast here
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2">
          <Clock size={11} className="text-white" />
        </span>
        <span className="text-sm font-semibold text-text">Version History</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 size={18} className="animate-spin text-text-dim" />
        </div>
      ) : versions.length === 0 ? (
        <div className="flex items-center justify-center flex-1 px-4">
          <span className="text-xs text-text-dim text-center">
            No version history yet. Edit the presentation to create versions.
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-surface2/70 transition-colors group"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent2" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">
                  {v.version_note || 'Auto-save'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-text-dim">{v.slide_count} slides</span>
                  <span className="text-[11px] text-text-dim flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(v.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRestore(v.id)}
                disabled={restoring === v.id}
                className={cn(
                  'opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border border-border',
                  'text-text-dim hover:text-accent hover:border-accent transition-all cursor-pointer',
                  'disabled:opacity-40 disabled:cursor-default',
                )}
                title="Restore this version"
              >
                {restoring === v.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}