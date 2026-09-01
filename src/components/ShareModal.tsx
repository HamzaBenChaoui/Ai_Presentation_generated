import { useState, useEffect, useCallback } from 'react'
import { Copy, X, Link2, Lock, Globe, Key, Timer, Code2 } from 'lucide-react'
import { sharesApi, type ShareInfo, type CreateShareRequest } from '../lib/api'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { useToast } from './ui/Toast'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  presentationId: string
}

const VISIBILITY_OPTIONS: { value: 'public' | 'private' | 'password'; label: string; icon: typeof Globe; hint: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, hint: 'Anyone with the link can view' },
  { value: 'password', label: 'Password', icon: Lock, hint: 'Require a password to view' },
  { value: 'private', label: 'Private', icon: Key, hint: 'Hidden from public access' },
]

// Link lifetime choices (hours; 0 = never expires).
const EXPIRY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Never' },
  { value: 24, label: '24 h' },
  { value: 24 * 7, label: '7 days' },
  { value: 24 * 30, label: '30 days' },
]

export default function ShareModal({ open, onClose, presentationId }: ShareModalProps) {
  const { toast } = useToast()
  const [shares, setShares] = useState<ShareInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create-share form state
  const [visibility, setVisibility] = useState<'public' | 'private' | 'password'>('public')
  const [password, setPassword] = useState('')
  const [permission, setPermission] = useState<'view' | 'present'>('view')
  const [expiryHours, setExpiryHours] = useState(0)
  const [embedFor, setEmbedFor] = useState<string | null>(null)

  const loadShares = useCallback(async () => {
    try {
      const res = await sharesApi.list(presentationId)
      setShares(res.shares ?? [])
    } catch {
      // silently ignore
    }
  }, [presentationId])

  useEffect(() => {
    if (open) {
      setLoading(true)
      loadShares().finally(() => setLoading(false))
    }
  }, [open, loadShares])

  const handleCreate = async () => {
    if (visibility === 'password' && !password.trim()) {
      toast.error('Please enter a password')
      return
    }
    setCreating(true)
    try {
      const req: CreateShareRequest = { visibility, permission }
      if (visibility === 'password') req.password = password
      if (expiryHours > 0) {
        req.expires_at = new Date(Date.now() + expiryHours * 3_600_000).toISOString()
      }
      await sharesApi.create(presentationId, req)
      await loadShares()
      // Reset form
      setPassword('')
      setVisibility('public')
      toast.success('Share link created')
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied'),
      () => toast.error('Failed to copy'),
    )
  }

  const handleRemove = async (token: string) => {
    try {
      await sharesApi.remove(token)
      await loadShares()
      toast.success('Share link removed')
    } catch {
      toast.error('Failed to remove link')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">Share Presentation</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Create form */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Visibility</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = visibility === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      selected
                        ? 'border-accent bg-accent/10 text-text'
                        : 'border-border text-text-dim hover:text-text hover:border-accent/40'
                    }`}
                    title={opt.hint}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {visibility === 'password' && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-surface2 text-text text-sm outline-none focus:border-accent"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Permission</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['view', 'present'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPermission(p)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    permission === p
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border text-text-dim hover:text-text hover:border-accent/40'
                  }`}
                >
                  {p === 'view' ? 'View only' : 'View + Present'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Timer size={11} />
              Link expiry
            </label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiryHours(opt.value)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    expiryHours === opt.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border text-text-dim hover:text-text hover:border-accent/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full"
            disabled={creating || (visibility === 'password' && !password.trim())}
            onClick={handleCreate}
          >
            {creating && <Spinner size="sm" />}
            <Link2 size={14} />
            <span>Create Link</span>
          </Button>
        </div>

        {/* Existing shares */}
        <div className="border-t border-border pt-4">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Active links</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}

            {!loading && shares.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">
                No share links yet. Create one above.
              </p>
            )}

            {shares.map((share) => (
              <div
                key={share.id}
                className="rounded-lg border border-border bg-surface2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {share.visibility === 'public' && <Globe size={14} className="text-text-dim shrink-0" />}
                    {share.visibility === 'password' && <Lock size={14} className="text-text-dim shrink-0" />}
                    {share.visibility === 'private' && <Key size={14} className="text-text-dim shrink-0" />}
                    <span className="text-xs text-text-dim truncate">
                      {window.location.origin}/shared/{share.token}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Embed code"
                      onClick={() => setEmbedFor(embedFor === share.token ? null : share.token)}
                    >
                      <Code2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Copy link" onClick={() => handleCopy(share.token)}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Remove link" onClick={() => handleRemove(share.token)}>
                      <X size={14} />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-dim">
                  <span title="Views">👁 {share.view_count ?? 0}</span>
                  {share.comments && share.comments.length > 0 && (
                    <span title="Reviewer comments">💬 {share.comments.length}</span>
                  )}
                  {share.expires_at && (
                    <span
                      className={new Date(share.expires_at) < new Date() ? 'text-red-400' : ''}
                      title="Link expiry"
                    >
                      <Timer size={10} className="inline mr-0.5 -mt-0.5" />
                      {new Date(share.expires_at) < new Date()
                        ? 'expired'
                        : `expires ${new Date(share.expires_at).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
                {embedFor === share.token && (
                  <div className="mt-2 border-t border-border pt-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim mb-1">
                      Embed in any website
                    </div>
                    <div className="flex items-start gap-1.5">
                      <code className="flex-1 text-[10px] leading-relaxed bg-bg rounded-lg p-2 break-all text-text-muted select-all">
                        {`<iframe src="${window.location.origin}/shared/${share.token}" width="960" height="540" frameborder="0" allowfullscreen></iframe>`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Copy embed code"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(
                              `<iframe src="${window.location.origin}/shared/${share.token}" width="960" height="540" frameborder="0" allowfullscreen></iframe>`,
                            )
                            .then(() => toast.success('Embed code copied'), () => toast.error('Failed to copy'))
                        }
                      >
                        <Copy size={13} />
                      </Button>
                    </div>
                  </div>
                )}
                {share.slide_time_json && Object.keys(share.slide_time_json).length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim mb-1">
                      Attention per slide
                    </div>
                    <div className="flex items-end gap-1 h-10">
                      {Object.entries(share.slide_time_json).map(([slideIdx, secs]) => {
                        const max = Math.max(...Object.values(share.slide_time_json!), 1)
                        return (
                          <div
                            key={slideIdx}
                            title={`Slide ${Number(slideIdx) + 1}: ${secs}s`}
                            className="flex-1 rounded-t bg-gradient-to-t from-accent/40 to-accent min-w-[6px]"
                            style={{ height: `${Math.max(8, (Number(secs) / max) * 100)}%` }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
                {share.comments && share.comments.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                    {share.comments.slice(-5).map((c, ci) => (
                      <div key={c.id ?? ci} className="text-xs">
                        <span className="font-semibold text-text">{c.author_name || 'Anonymous'}:</span>{' '}
                        <span className="text-text-muted">{c.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
