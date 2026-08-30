import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { generationApi, ApiClientError } from '../../lib/api'
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

export default function ThemePickerModal({ prompt, slideCount, tone, language, onBack }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selected, setSelected] = useState<ThemeName>('custom')
  const [generating, setGenerating] = useState(false)

  const themeEntries = useMemo(() => {
    return (Object.keys(themeMap) as ThemeName[]).map(name => ({
      name,
      ...themeMap[name],
    }))
  }, [])

  const demo = useMemo(() => demoSpec(selected), [selected])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const created = await generationApi.generate({
        prompt,
        slide_count: slideCount,
        tone,
        language,
        theme: selected,
        model: getSettings().aiModel || null,
      })
      navigate(`/editor/${created.id}`)
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Generation failed'
      toast.error(msg)
      setGenerating(false)
    }
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
            <button
              onClick={handleGenerate}
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

          {/* Main: themes left, preview right */}
          <div className="flex gap-6 items-start">
            {/* Theme grid */}
            <div className="w-[380px] shrink-0">
              <div className="grid grid-cols-2 gap-3">
                {themeEntries.map(t => {
                  const isSelected = t.name === selected
                  return (
                    <button
                      key={t.name}
                      onClick={() => setSelected(t.name)}
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
              </div>
            </div>

            {/* Live preview */}
            <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden bg-surface">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-text-dim">Live Preview</span>
                <span className="text-xs text-text-dim/70">4 pages · scroll</span>
              </div>
              <div className="h-[480px] overflow-auto p-4">
                <DeckThemeProvider initial={selected}>
                  <PresentationRenderer spec={demo} />
                </DeckThemeProvider>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}