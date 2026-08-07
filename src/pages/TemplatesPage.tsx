import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Presentation as PresentationIcon, Search, Sparkles, ArrowRight, Loader2, LayoutTemplate } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { templatesApi, generationApi, ApiClientError } from '../lib/api'
import type { TemplateInfo } from '../lib/api'

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

export default function TemplatesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [suggested, setSuggested] = useState<string | null>(null)

  const [active, setActive] = useState<TemplateInfo | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  // ── Load templates ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await templatesApi.list()
      setTemplates(res.templates)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  // ── Suggest (query >= 3 chars) ─────────────────────────────────────────────

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setSuggested(null)
      return
    }
    let cancelled = false
    templatesApi
      .suggest(q)
      .then((res) => {
        if (!cancelled) setSuggested(res.template.name)
      })
      .catch(() => {
        if (!cancelled) setSuggested(null)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }, [templates, query])

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!active) return
    const trimmed = prompt.trim()
    if (!trimmed) return
    try {
      setGenerating(true)
      const created = await generationApi.generate({
        prompt: trimmed,
        slide_count: active.slides.length,
        tone: 'Professional',
        language: 'English',
        theme: null,
        template_name: active.name,
      })
      toast.success('Presentation generated')
      navigate(`/editor/${created.id}`)
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Generation failed'
      toast.error(msg)
      setGenerating(false)
    }
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
          <LayoutTemplate size={13} />
          Templates
        </span>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-bold text-text">
          Start from a{' '}
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
            proven structure
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Pick a template — your prompt fills in the content.
        </p>
      </motion.section>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="relative max-w-md"
      >
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input
          className="pl-9 h-11 rounded-xl"
          placeholder="Search templates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggested && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent">
            ✦ suggested
          </span>
        )}
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton height={18} width="45%" />
              <Skeleton height={12} width="80%" />
              <Skeleton height={10} width="60%" />
              <Skeleton height={34} width={160} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PresentationIcon}
          title="No templates match"
          description="Try a different search"
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {filtered.map((t, i) => {
              const isRec = suggested === t.name
              return (
                <motion.div
                  key={t.name}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: easeOut }}>
                    <SpotlightCard
                      className={`h-full flex flex-col gap-3 p-5 ${
                        isRec ? 'border-accent/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-text capitalize">
                            {t.name.replace(/_/g, ' ')}
                          </p>
                          {isRec && (
                            <Badge variant="accent" className="mt-1.5">
                              <Sparkles size={11} />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <Badge variant="default">{t.slides.length} slides</Badge>
                      </div>

                      <p className="text-sm text-text-muted">{t.description}</p>

                      <ol className="flex flex-col gap-1.5 flex-1">
                        {t.slides.map((s, si) => (
                          <li key={si} className="flex items-baseline gap-2 text-xs text-text-dim">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent tabular-nums">
                              {si + 1}
                            </span>
                            {s.purpose}
                            <span className="text-text-dim/60">({s.layout})</span>
                          </li>
                        ))}
                      </ol>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="group/use w-full"
                          onClick={() => {
                            setActive(t)
                            setPrompt('')
                          }}
                        >
                          Use this template
                          <ArrowRight size={14} className="transition-transform group-hover/use:translate-x-1" />
                        </Button>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Generate modal */}
      <Modal
        open={active !== null}
        onClose={() => {
          if (!generating) setActive(null)
        }}
        title={`Generate with ${active?.name.replace(/_/g, ' ')} template`}
      >
        {active && (
          <div className="flex flex-col gap-4">
            <Textarea
              autoFocus
              placeholder="Describe the presentation content…"
              className="min-h-[120px] rounded-xl"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-dim">
                {active.slides.length} slides · follows the {active.name.replace(/_/g, ' ')} structure
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={generating} onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={generating}
                  disabled={!prompt.trim()}
                  onClick={handleGenerate}
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
