import { useEffect, useState } from 'react'
import { Cpu, RefreshCw } from 'lucide-react'
import { modelsApi, type ModelInfo } from '../../lib/api'
import { cn } from '../../lib/cn'

// Module-level cache so Settings + AI panel share one fetch per session.
let cache: { models: ModelInfo[]; default: string } | null = null
let inflight: Promise<{ models: ModelInfo[]; default: string }> | null = null

async function loadCatalog(): Promise<{ models: ModelInfo[]; default: string }> {
  if (cache) return cache
  if (!inflight) {
    inflight = modelsApi
      .list()
      .then((res) => {
        cache = { models: res.models, default: res.default }
        return cache
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** "nemotron-3-ultra-free" → "Nemotron 3 Ultra · free" */
function prettyModelName(id: string): string {
  const free = id.endsWith('-free')
  const base = free ? id.slice(0, -'-free'.length) : id
  const words = base
    .split(/[-.]/)
    .filter(Boolean)
    .map((w) => (/^\d/.test(w) || w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
  const label = words.join(' ')
  return free ? `${label} · free` : label
}

interface Props {
  value: string
  onChange: (modelId: string) => void
  /** Compact = AI panel header style; default = settings page style. */
  compact?: boolean
  className?: string
}

/**
 * Model picker for Slide AI. Lists the provider catalog (fetched from the
 * backend, cached) plus a "Provider default" entry. `value === ''` means
 * "use the backend default".
 */
export default function ModelSelect({ value, onChange, compact = false, className }: Props) {
  const [models, setModels] = useState<ModelInfo[]>(cache?.models ?? [])
  const [defaultModel, setDefaultModel] = useState<string>(cache?.default ?? '')
  const [loading, setLoading] = useState(!cache)
  const [failed, setFailed] = useState(false)

  const load = () => {
    setLoading(true)
    setFailed(false)
    loadCatalog()
      .then((res) => {
        setModels(res.models)
        setDefaultModel(res.default)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  // Initial fetch — state updates only arrive asynchronously (via the promise
  // callbacks), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    loadCatalog()
      .then((res) => {
        if (!cancelled) {
          setModels(res.models)
          setDefaultModel(res.default)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const options = models.length > 0 ? models : []

  if (compact) {
    return (
      <div className={cn('relative flex items-center', className)} title="Slide AI model">
        <Cpu size={12} className="absolute left-2 text-text-dim pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading && options.length === 0}
          className={cn(
            'appearance-none pl-7 pr-5 py-1 rounded-lg border border-border bg-surface2 text-[11px] font-medium text-text',
            'hover:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer max-w-[150px]',
            'disabled:opacity-50',
          )}
        >
          <option value="">Model: default{defaultModel ? ` (${prettyModelName(defaultModel)})` : ''}</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {prettyModelName(m.id)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium text-text">AI model</label>
      <div className="mt-1.5 flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading && options.length === 0}
          className="block w-full h-10 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        >
          <option value="">
            Provider default{defaultModel ? ` — ${prettyModelName(defaultModel)}` : ''}
          </option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {prettyModelName(m.id)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          className="shrink-0 p-2 rounded-lg text-text-dim hover:text-text hover:bg-surface2 transition-colors cursor-pointer"
          title="Refresh model list"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="mt-1.5 text-xs text-text-dim">
        {failed
          ? 'Could not load the model list — the provider default will be used.'
          : value
            ? `Generation and AI edits will use ${value}.`
            : 'Slide AI picks the best default model. Choose one to pin it for generation and AI edits.'}
      </p>
    </div>
  )
}
