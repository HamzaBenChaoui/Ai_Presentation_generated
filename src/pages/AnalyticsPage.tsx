import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, Eye, MessageSquare, Clock } from 'lucide-react'
import { presentationsApi, sharesApi, type ShareInfo } from '../lib/api'
import { ApiClientError } from '../lib/api'
import type { Presentation } from '../types'
import { Spinner } from '../components/ui/Spinner'
import { Card } from '../components/ui/Card'

// Deck analytics: aggregate share views, per-slide attention (seconds spent
// by shared viewers) and reviewer comments into one visual page.

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Presentation | null>(null)
  const [shares, setShares] = useState<ShareInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [deckRes, sharesRes] = await Promise.all([
        presentationsApi.get(id),
        sharesApi.list(id),
      ])
      setDeck(deckRes)
      setShares(sharesRes.shares ?? [])
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load analytics')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const totalViews = useMemo(
    () => shares.reduce((sum, s) => sum + (s.view_count ?? 0), 0),
    [shares],
  )
  const totalComments = useMemo(
    () => shares.reduce((sum, s) => sum + (s.comments?.length ?? 0), 0),
    [shares],
  )

  // Average seconds per slide across all shares (slide index → avg secs).
  const slideTimes = useMemo(() => {
    const sums: Record<number, { total: number; n: number }> = {}
    for (const share of shares) {
      const json = share.slide_time_json
      if (!json) continue
      for (const [idx, secs] of Object.entries(json)) {
        const k = Number(idx)
        if (!Number.isFinite(k)) continue
        sums[k] = sums[k] || { total: 0, n: 0 }
        sums[k].total += Number(secs) || 0
        sums[k].n += 1
      }
    }
    return Object.entries(sums)
      .map(([idx, v]) => ({ slide: Number(idx), avg: v.total / Math.max(1, v.n) }))
      .sort((a, b) => a.slide - b.slide)
  }, [shares])

  const maxAvg = Math.max(...slideTimes.map((s) => s.avg), 1)
  const deckSlideCount = deck?.slide_count ?? 0

  // Drop-off: slides with no recorded attention near the end of the deck.
  const recordedUpTo = slideTimes.reduce((max, s) => Math.max(max, s.slide + 1), 0)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-text-dim hover:text-text transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <BarChart3 size={18} />
          </span>
          <h1 className="text-2xl font-bold text-text truncate">
            {deck?.title || 'Analytics'}
          </h1>
        </div>
        <p className="text-sm text-text-muted mb-6">
          How shared viewers actually read this deck.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Headline stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-dim mb-1">
              <Eye size={12} />
              Total views
            </div>
            <p className="text-2xl font-bold text-text tabular-nums">{totalViews}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-dim mb-1">
              <Clock size={12} />
              Avg time / slide
            </div>
            <p className="text-2xl font-bold text-text tabular-nums">
              {slideTimes.length
                ? `${Math.round(slideTimes.reduce((s, x) => s + x.avg, 0) / slideTimes.length)}s`
                : '—'}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-dim mb-1">
              <MessageSquare size={12} />
              Comments
            </div>
            <p className="text-2xl font-bold text-text tabular-nums">{totalComments}</p>
          </Card>
        </div>

        {/* Attention per slide */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-1">Attention per slide</h2>
          <p className="text-xs text-text-dim mb-4">
            Average seconds shared viewers spent on each slide. Short bars near the
            end usually mean the deck lost them.
          </p>
          {slideTimes.length === 0 ? (
            <p className="text-xs text-text-dim py-6 text-center">
              No viewer timing data yet — share the deck and the data will appear here.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-40">
                {slideTimes.map(({ slide, avg }) => (
                  <div key={slide} className="flex-1 h-full flex flex-col items-center gap-1 min-w-[14px]">
                    <span className="text-[9px] text-text-dim tabular-nums shrink-0">{Math.round(avg)}s</span>
                    <div
                      title={`Slide ${slide + 1}: ${Math.round(avg)}s average`}
                      className="w-full flex-1 flex items-end"
                    >
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent"
                        style={{ height: `${Math.max(4, (avg / maxAvg) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-text-dim tabular-nums shrink-0">{slide + 1}</span>
                  </div>
                ))}
              </div>
              {deckSlideCount > recordedUpTo && recordedUpTo > 0 && (
                <p className="mt-3 text-[11px] text-amber-400">
                  No attention recorded for slides {recordedUpTo + 1}–{deckSlideCount} — viewers likely
                  dropped off before the end.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Per-share breakdown */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-3">Share links</h2>
          {shares.length === 0 ? (
            <p className="text-xs text-text-dim py-4 text-center">
              No share links yet — create one from the editor.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-xs text-text-muted truncate">
                    /shared/{share.token.slice(0, 12)}… ({share.visibility})
                  </span>
                  <div className="flex items-center gap-3 text-xs text-text-dim shrink-0">
                    <span>👁 {share.view_count ?? 0}</span>
                    <span>💬 {share.comments?.length ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Comments */}
        {totalComments > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text mb-3">Reviewer comments</h2>
            <div className="flex flex-col gap-2.5">
              {shares.flatMap((s) => s.comments ?? []).map((c, i) => (
                <div key={c.id ?? i} className="rounded-xl border border-border px-3 py-2">
                  <span className="text-xs font-semibold text-text">{c.author_name || 'Anonymous'}</span>
                  <span className="text-[10px] text-text-dim ml-2">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
