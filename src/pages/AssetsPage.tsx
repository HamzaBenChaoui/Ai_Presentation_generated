import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Image as ImageIcon, Copy, Download, Check, Loader2, Images } from 'lucide-react'
import { cn } from '../lib/cn'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { assetsApi, ApiClientError } from '../lib/api'
import type { AssetItem, AssetKind } from '../lib/api'

type KindFilter = 'all' | 'image' | 'icon'

// ── Primitives (mêmes que la home) ─────────────────────────────────────────

const easeOut = [0.22, 1, 0.36, 1] as const

function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: easeOut },
  }),
}

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'icon', label: 'Icons' },
]

/** Renders a data:image/svg+xml URL as inline SVG. */
function IconThumb({ url, alt }: { url: string; alt: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setSvg(text)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (error || svg === null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-text-dim">
        {error ? <span>{alt}</span> : <Loader2 size={20} className="animate-spin" />}
      </div>
    )
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center text-text"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default function AssetsPage() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Debounce search input by 300ms ─────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // ── Search ─────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string, k: KindFilter) => {
    try {
      setLoading(true)
      setError(null)
      if (k === 'all') {
        const [images, icons] = await Promise.all([
          assetsApi.search(q, 'image' as AssetKind, 12),
          assetsApi.search(q, 'icon' as AssetKind, 12),
        ])
        const seen = new Set<string>()
        setItems(
          [...images.items, ...icons.items].filter((it) => {
            if (seen.has(it.id)) return false
            seen.add(it.id)
            return true
          }),
        )
      } else {
        const res = await assetsApi.search(q, k, 12)
        setItems(res.items)
      }
    } catch (err) {
      setItems([])
      if (err instanceof ApiClientError) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    runSearch(debounced, kind)
  }, [debounced, kind, runSearch])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCopyUrl = async (item: AssetItem) => {
    try {
      await navigator.clipboard.writeText(item.url)
      setCopiedId(item.id)
      toastRef.current.success('URL copied')
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toastRef.current.error('Could not copy URL')
    }
  }

  const handleDownload = (item: AssetItem) => {
    const a = document.createElement('a')
    a.href = item.url
    a.download = `${item.id}.svg`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col gap-8 pb-12">
      {/* Aurora background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <Images size={13} />
          Assets
        </span>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-bold text-text">
          Find the perfect{' '}
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
            visuals
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Search images and icons to drop into your slides.
        </p>
      </motion.section>

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"
      >
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input
            className="pl-9 h-11 rounded-xl"
            placeholder="Search assets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Segmented control */}
        <div className="inline-flex rounded-xl border border-border bg-surface/80 p-1 backdrop-blur-sm">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setKind(opt.key)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer',
                kind === opt.key
                  ? 'bg-gradient-to-r from-accent to-accent2 text-white shadow-sm shadow-accent/25'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-0 overflow-hidden">
              <Skeleton height={140} borderRadius={0} />
              <div className="p-3">
                <Skeleton height={10} width="60%" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={ImageIcon}
          title="Could not load assets"
          description={error}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No assets found"
          description="Try a different search or kind"
        />
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: easeOut }}>
                  <SpotlightCard className="p-0">
                    <div className="h-[140px] relative">
                      {item.kind === 'icon' ? (
                        <div className="h-full w-full bg-surface2">
                          <IconThumb key={item.url} url={item.url} alt={item.id} />
                        </div>
                      ) : (
                        <img
                          src={item.thumbnail ?? item.url}
                          alt={item.id}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}

                      {item.attribution && (
                        <Badge
                          variant="default"
                          className="absolute top-2 left-2 bg-black/60 text-white backdrop-blur-sm"
                        >
                          {item.attribution}
                        </Badge>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <motion.button
                          initial={{ scale: 0.85 }}
                          whileHover={{ scale: 1.05 }}
                          title="Copy URL"
                          onClick={() => handleCopyUrl(item)}
                          className="rounded-lg bg-white/90 p-2 text-text hover:bg-white transition-colors cursor-pointer"
                        >
                          {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
                        </motion.button>
                        <motion.button
                          initial={{ scale: 0.85 }}
                          whileHover={{ scale: 1.05 }}
                          title="Download"
                          onClick={() => handleDownload(item)}
                          className="rounded-lg bg-white/90 p-2 text-text hover:bg-white transition-colors cursor-pointer"
                        >
                          <Download size={16} />
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-text-muted truncate capitalize">
                        {item.provider || item.kind}
                      </p>
                    </div>
                  </SpotlightCard>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
