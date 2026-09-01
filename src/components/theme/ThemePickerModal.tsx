import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, ArrowUp, ArrowDown, Trash2, Sparkles, Loader2, Plus, ListTree, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { generationApi, themesApi, ApiClientError, type UserTheme } from '../../lib/api'
import { getSettings } from '../../lib/settings'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../ui/Toast'
import { themeMap, type ThemeName } from '../renderer/theme'
import PresentationRenderer from '../renderer/PresentationRenderer'
import { DeckThemeProvider } from '../renderer/DeckThemeContext'
import type { PresentationSpec } from '../../types'

interface Props {
  prompt: string
  slideCount: number
  tone: string
  language: string
  onBack: () => void
}

/** A minimal demo spec for live preview. */
function demoSpec(theme: ThemeName): PresentationSpec {
  return {
    meta: { title: 'Your Presentation', theme, background: null, language: 'English', tone: 'Professional' },
    slides: [
      {
        layout: 'hero',
        elements: [
          { type: 'title', text: 'Your Great Idea', level: 1 },
          { type: 'subtitle', text: 'A compelling story starts here' },
        ],
      },
      {
        layout: 'statistics',
        elements: [
          { type: 'title', text: 'Key Metrics', level: 2 },
          { type: 'statistics', items: [
            { value: '94%', label: 'Growth' },
            { value: '2.4M', label: 'Users' },
            { value: '$18M', label: 'Revenue' },
          ] },
        ],
      },
      {
        layout: 'cards',
        elements: [
          { type: 'title', text: 'Three Pillars', level: 2 },
          { type: 'cards', items: [
            { title: 'Innovation', body: 'Pushing boundaries with fresh ideas' },
            { title: 'Execution', body: 'Turning vision into reality' },
            { title: 'Impact', body: 'Measurable results that matter' },
          ] },
        ],
      },
      {
        layout: 'timeline',
        elements: [
          { type: 'title', text: 'Roadmap', level: 2 },
          { type: 'timeline', items: [
            { year: 'Q1', text: 'Research & discovery' },
            { year: 'Q2', text: 'Prototype & test' },
            { year: 'Q3', text: 'Launch & scale' },
          ] },
        ],
      },
    ],
  }
}

interface OutlineEntry {
  title: string
  points: string[]
}

// --- new-custom-theme mini form -----------------------------------------------

const FONTS = [
  { label: 'Syne (display)', value: "'Syne', 'Space Grotesk', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { label: 'DM Sans', value: "'DM Sans', 'Inter', sans-serif" },
  { label: 'Lora (serif)', value: "'Lora', 'Georgia', serif" },
  { label: 'System / Apple', value: "'SF Pro Display', '-apple-system', 'Helvetica Neue', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', 'Fluent', sans-serif" },
]

function NewThemeForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [bg, setBg] = useState('#0b0b12')
  const [text, setText] = useState('#f5f5f4')
  const [accent, setAccent] = useState('#7c5cff')
  const [accent2, setAccent2] = useState('#22d3ee')
  const [accent3, setAccent3] = useState('#f472b6')
  const [fontHeading, setFontHeading] = useState(FONTS[0].value)
  const [fontBody, setFontBody] = useState(FONTS[2].value)
  const [ambientKind, setAmbientKind] = useState<'blobs' | 'grid' | 'grain' | 'organic' | 'particles'>('blobs')
  const [busy, setBusy] = useState(false)

  const gradient = `linear-gradient(135deg, ${accent}, ${accent2} 55%, ${accent3})`

  const save = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await themesApi.create(name.trim(), {
        bg,
        surface: '#171722',
        surface2: '#1f1f2e',
        border: 'rgba(255,255,255,0.10)',
        text,
        textMuted: `${text}99`,
        textDim: `${text}66`,
        accent,
        accent2,
        accent3,
        fontHeading,
        fontBody,
        radius: '14px',
        radiusLg: '20px',
        gradient,
        cardShadow: '0 12px 40px rgba(0,0,0,0.35)',
        buttonRadius: '12px',
        energy: 'dynamic',
        ambient: { kind: ambientKind, colors: [accent, accent2, accent3], opacity: 0.5, speed: 26 },
      })
      toast.success(`Theme "${name.trim()}" saved`)
      onDone()
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save the theme')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-[min(520px,95vw)] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-text">Create a custom theme</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text cursor-pointer"><X size={16} /></button>
        </div>

        <div className="h-16 rounded-xl mb-4 border border-border" style={{ background: gradient }} />

        <label className="block text-xs font-semibold text-text-muted mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My brand theme"
          className="w-full h-9 px-3 rounded-xl border border-border bg-bg text-sm text-text outline-none focus:border-accent/60 mb-3"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          {([
            ['Background', bg, setBg],
            ['Text', text, setText],
            ['Accent', accent, setAccent],
            ['Accent 2', accent2, setAccent2],
            ['Accent 3', accent3, setAccent3],
          ] as const).map(([label, value, setter]) => (
            <label key={label} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
              <span className="text-xs text-text-muted">{label}</span>
              <input type="color" value={value} onChange={(e) => setter(e.target.value)} className="w-7 h-7 bg-transparent cursor-pointer" />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Heading font</span>
            <select value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className="h-9 px-2 rounded-xl border border-border bg-bg text-xs text-text cursor-pointer">
              {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Body font</span>
            <select value={fontBody} onChange={(e) => setFontBody(e.target.value)} className="h-9 px-2 rounded-xl border border-border bg-bg text-xs text-text cursor-pointer">
              {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs font-semibold text-text-muted">Ambient motion</span>
          <select
            value={ambientKind}
            onChange={(e) => setAmbientKind(e.target.value as typeof ambientKind)}
            className="h-9 px-2 rounded-xl border border-border bg-bg text-xs text-text cursor-pointer"
          >
            {(['blobs', 'grid', 'grain', 'organic', 'particles'] as const).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-sm text-text-muted hover:text-text cursor-pointer">Cancel</button>
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Save theme
          </button>
        </div>
      </div>
    </div>
  )
}

// --- outline review step -------------------------------------------------------

export default function ThemePickerModal({ prompt, slideCount, tone, language, onBack }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selected, setSelected] = useState<ThemeName>('custom')
  const [generating, setGenerating] = useState(false)
  const [userThemes, setUserThemes] = useState<UserTheme[]>([])
  const [selectedUserTheme, setSelectedUserTheme] = useState<UserTheme | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  // Outline-first flow state.
  const [outlineStep, setOutlineStep] = useState(false)
  const [outline, setOutline] = useState<OutlineEntry[]>([])
  const [outlineLoading, setOutlineLoading] = useState(false)

  useEffect(() => {
    themesApi
      .list()
      .then((res) => setUserThemes(res.themes))
      .catch(() => {})
  }, [])

  const themeEntries = useMemo(() => {
    return (Object.keys(themeMap) as ThemeName[]).map(name => ({
      name,
      ...themeMap[name],
    }))
  }, [])

  const demo = useMemo(() => demoSpec(selectedUserTheme ? 'custom' : selected), [selected, selectedUserTheme])

  const loadUserThemes = () => {
    themesApi
      .list()
      .then((res) => setUserThemes(res.themes))
      .catch(() => {})
  }

  const handleGenerate = async (approvedOutline?: OutlineEntry[]) => {
    setGenerating(true)
    try {
      const created = await generationApi.generate({
        prompt,
        slide_count: approvedOutline ? approvedOutline.length : slideCount,
        tone,
        language,
        theme: selectedUserTheme ? `u_${selectedUserTheme.id.replace(/-/g, '')}` : selected,
        model: getSettings().aiModel || null,
        ...(approvedOutline ? { outline: approvedOutline } : {}),
        ...(selectedUserTheme ? { theme_tokens: selectedUserTheme.tokens } : {}),
      })
      navigate(`/editor/${created.id}`, { state: { runDoctor: true } })
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Generation failed'
      toast.error(msg)
      setGenerating(false)
    }
  }

  /** Outline-first: fetch the plan, then move to the review step. */
  const handleGenerateWithOutline = async () => {
    setOutlineLoading(true)
    try {
      const res = await generationApi.outline({
        prompt,
        slide_count: slideCount,
        language,
        tone,
        model: getSettings().aiModel || null,
      })
      setOutline(res.outline.map((o) => ({ title: o.title, points: o.points ?? [] })))
      setOutlineStep(true)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not build the outline')
    } finally {
      setOutlineLoading(false)
    }
  }

  const patchOutline = (i: number, patch: Partial<OutlineEntry>) =>
    setOutline((cur) => cur.map((entry, k) => (k === i ? { ...entry, ...patch } : entry)))

  const moveOutline = (i: number, dir: -1 | 1) =>
    setOutline((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  // ── Outline review step ─────────────────────────────────────────────────
  if (outlineStep) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-bg overflow-auto"
        >
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <button onClick={() => setOutlineStep(false)} className="text-sm text-text-dim hover:text-text transition-colors mb-2 cursor-pointer">
                  ← Themes
                </button>
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <ListTree size={18} className="text-accent" />
                  Review the plan
                </h2>
                <p className="text-sm text-text-dim mt-1">
                  Reorder, edit or drop slides before generating the full deck.
                </p>
              </div>
              <button
                onClick={() => handleGenerate(outline)}
                disabled={generating || outline.length === 0}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                  'bg-accent text-white hover:opacity-90 disabled:opacity-50',
                )}
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate deck
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {outline.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-accent/10 text-accent text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      value={entry.title}
                      onChange={(e) => patchOutline(i, { title: e.target.value })}
                      className="w-full bg-transparent text-sm font-semibold text-text outline-none focus:text-accent"
                    />
                    <input
                      value={entry.points.join(' · ')}
                      onChange={(e) =>
                        patchOutline(i, { points: e.target.value.split('·').map((p) => p.trim()).filter(Boolean) })
                      }
                      placeholder="key points (separate with ·)"
                      className="w-full bg-transparent text-xs text-text-dim outline-none mt-0.5 focus:text-text-muted"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => moveOutline(i, -1)} disabled={i === 0} className="p-1 rounded-lg text-text-dim hover:text-text disabled:opacity-30 cursor-pointer" title="Move up"><ArrowUp size={14} /></button>
                    <button onClick={() => moveOutline(i, 1)} disabled={i === outline.length - 1} className="p-1 rounded-lg text-text-dim hover:text-text disabled:opacity-30 cursor-pointer" title="Move down"><ArrowDown size={14} /></button>
                    <button onClick={() => setOutline((cur) => cur.filter((_, k) => k !== i))} className="p-1 rounded-lg text-text-dim hover:text-red-400 cursor-pointer" title="Remove slide"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setOutline((cur) => [...cur, { title: 'New slide', points: [] }])}
                className="h-10 rounded-xl border border-dashed border-border text-xs font-medium text-text-dim hover:border-accent/50 hover:text-accent transition-all cursor-pointer"
              >
                + Add slide
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-bg overflow-auto"
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button
                onClick={onBack}
                className="text-sm text-text-dim hover:text-text transition-colors mb-2 cursor-pointer"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-text">Choose a theme</h2>
              <p className="text-sm text-text-dim mt-1">
                Your presentation will be generated with this theme applied.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateWithOutline}
                disabled={generating || outlineLoading}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                  'border border-accent/50 text-accent hover:bg-accent/10 disabled:opacity-50',
                )}
                title="Review and edit the slide plan before generating"
              >
                {outlineLoading ? <Loader2 size={16} className="animate-spin" /> : <ListTree size={16} />}
                Outline first
              </button>
              <button
                onClick={() => handleGenerate()}
                disabled={generating}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                  'bg-accent text-white hover:opacity-90 disabled:opacity-50',
                )}
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Continue
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main: themes left, preview right */}
          <div className="flex gap-6 items-start">
            {/* Theme grid */}
            <div className="w-[380px] shrink-0">
              <div className="grid grid-cols-2 gap-3">
                {themeEntries.map(t => {
                  const isSelected = !selectedUserTheme && t.name === selected
                  return (
                    <button
                      key={t.name}
                      onClick={() => { setSelected(t.name); setSelectedUserTheme(null) }}
                      className={cn(
                        'relative text-left rounded-xl border p-3 transition-all cursor-pointer',
                        isSelected
                          ? 'border-accent ring-1 ring-accent/20 bg-surface'
                          : 'border-border bg-surface hover:border-accent/40',
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}

                      {/* Mini gradient preview */}
                      <div
                        className="w-full h-10 rounded-lg mb-2"
                        style={{ background: t.tokens.gradient }}
                      />

                      {/* Color palette dots */}
                      <div className="flex items-center gap-1.5 mb-2">
                        {[t.tokens.accent, t.tokens.accent2, t.tokens.accent3, t.tokens.text, t.tokens.bg].map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ background: c }}
                          />
                        ))}
                      </div>

                      <p className="text-sm font-semibold text-text">{t.label}</p>
                    </button>
                  )
                })}

                {/* User-saved themes */}
                {userThemes.map((ut) => {
                  const tokens = (ut.tokens ?? {}) as Record<string, string>
                  const isSelected = selectedUserTheme?.id === ut.id
                  return (
                    <div
                      key={ut.id}
                      onClick={() => { setSelectedUserTheme(ut); setSelected('custom') }}
                      className={cn(
                        'relative text-left rounded-xl border p-3 transition-all cursor-pointer group',
                        isSelected
                          ? 'border-accent ring-1 ring-accent/20 bg-surface'
                          : 'border-border bg-surface hover:border-accent/40',
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center z-10">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          themesApi.remove(ut.id).then(loadUserThemes).catch(() => {})
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-text-dim hover:text-red-400 cursor-pointer"
                        title="Delete theme"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="w-full h-10 rounded-lg mb-2" style={{ background: tokens.gradient || tokens.accent || '#333' }} />
                      <div className="flex items-center gap-1.5 mb-2">
                        {[tokens.accent, tokens.accent2, tokens.accent3, tokens.text, tokens.bg].map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ background: c || '#333' }} />
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-text truncate">{ut.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-accent">my theme</p>
                    </div>
                  )
                })}

                {/* New custom theme */}
                <button
                  onClick={() => setFormOpen(true)}
                  className="rounded-xl border border-dashed border-border p-3 text-left transition-all hover:border-accent/50 cursor-pointer flex flex-col items-center justify-center min-h-[120px] gap-2"
                >
                  <span className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <Plus size={18} />
                  </span>
                  <span className="text-xs font-semibold text-text-muted">New custom theme</span>
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden bg-surface">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-text-dim">Live Preview</span>
                <span className="text-xs text-text-dim/70">4 pages · scroll</span>
              </div>
              <div className="h-[480px] overflow-auto p-4">
                <DeckThemeProvider initial={selectedUserTheme ? 'custom' : selected} tokenOverrides={selectedUserTheme?.tokens ?? null}>
                  <PresentationRenderer spec={demo} />
                </DeckThemeProvider>
              </div>
            </div>
          </div>
        </div>

        {formOpen && (
          <NewThemeForm onDone={loadUserThemes} onClose={() => setFormOpen(false)} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
