import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Stethoscope, Sparkles, CheckCircle2, X } from 'lucide-react'
import SlideRenderer from '../renderer/SlideRenderer'
import { collectSlideDiagnostics, type SlideDiagnostic } from '../../lib/slideDiagnostics'
import { aiEditApi, ApiClientError } from '../../lib/api'
import { useEditor } from './EditorContext'
import { useDeckTheme } from '../renderer/DeckThemeContext'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  presentationId: string
}

interface SlideIssues {
  slideIndex: number
  diagnostics: SlideDiagnostic[]
  contentNotes: string[]
}

const SCAN_RENDER_WIDTH = 1024
const SCAN_RENDER_HEIGHT = 576
const SCAN_SETTLE_MS = 700

/**
 * Deck Doctor — one-click full-deck audit.
 *
 * Renders EVERY slide offscreen at presentation size, measures real bounding
 * boxes (overlaps, overflow, truncation) plus deterministic content checks,
 * then offers a one-click batch AI fix through the AI-edit endpoint.
 */
export default function DeckDoctorModal({ open, onClose, presentationId }: Props) {
  const { spec, applyAiEdit } = useEditor()
  const deck = useDeckTheme()
  const { toast } = useToast()

  const scanRootRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'report'>('idle')
  const [scanNonce, setScanNonce] = useState(0)
  const [issues, setIssues] = useState<SlideIssues[]>([])
  const [fixing, setFixing] = useState(false)
  const [fixedSummary, setFixedSummary] = useState<string | null>(null)

  const totalSlides = spec?.slides.length ?? 0
  const issueCount = issues.reduce((n, s) => n + s.diagnostics.length + s.contentNotes.length, 0)
  const affectedSlides = issues.map((s) => s.slideIndex)

  const runScan = useCallback(async () => {
    if (!spec || !scanRootRef.current) return []
    const results: SlideIssues[] = []
    const containers = scanRootRef.current.querySelectorAll<HTMLElement>('[data-scan-index]')
    for (const container of Array.from(containers)) {
      const slideIndex = Number(container.dataset.scanIndex)
      const slideEl = container.firstElementChild
      const diagnostics = slideEl instanceof HTMLElement ? collectSlideDiagnostics(slideEl) : []

      const contentNotes: string[] = []
      const slide = spec.slides[slideIndex]
      if (slide && slide.layout !== 'custom') {
        if (slide.elements.length === 0) {
          contentNotes.push('empty slide — add content or remove it')
        } else if (!slide.elements.some((e) => (e.text ?? '').trim())) {
          contentNotes.push('no readable text on this slide — add a title or some content')
        }
      }

      if (diagnostics.length > 0 || contentNotes.length > 0) {
        results.push({ slideIndex, diagnostics, contentNotes })
      }
    }
    return results
  }, [spec])

  // Scan whenever the modal opens or a re-scan is requested.
  useEffect(() => {
    if (!open) {
      setPhase('idle')
      setIssues([])
      setFixedSummary(null)
      return
    }
    let alive = true
    setPhase('scanning')
    setIssues([])
    setFixedSummary(null)
    const timer = setTimeout(async () => {
      try {
        await document.fonts?.ready
      } catch {
        /* fonts API unavailable */
      }
      const results = await runScan()
      if (!alive) return
      setIssues(results)
      setPhase('report')
    }, SCAN_SETTLE_MS)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [open, scanNonce, runScan])

  const fixWithAi = async () => {
    setFixing(true)
    try {
      const lines: string[] = []
      for (const s of issues) {
        for (const d of s.diagnostics) {
          lines.push(`- Slide ${s.slideIndex + 1}: [${d.problem}] ${d.detail}`)
        }
        for (const note of s.contentNotes) {
          lines.push(`- Slide ${s.slideIndex + 1}: ${note}`)
        }
      }
      const instruction =
        'DECK DOCTOR — real measurements from the rendered deck. Fix each geometry/content ' +
        'problem listed below (adjust element x/y/w, shorten or split text, reduce content, ' +
        'or restructure the affected slides). Keep everything else about the deck unchanged.\n' +
        lines.slice(0, 50).join('\n')

      const res = await aiEditApi.run(presentationId, {
        instruction,
        target_indexes: affectedSlides,
      })
      applyAiEdit(res.spec)
      setFixedSummary(res.summary || 'AI fixes applied.')
      toast.success('AI fixes applied — re-scanning…')
      // Re-scan so the report reflects the fixed deck.
      setTimeout(() => setScanNonce((n) => n + 1), 400)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'AI fix failed')
    } finally {
      setFixing(false)
    }
  }

  if (!open || !spec) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      {/* Offscreen render surface: every slide at presentation size, measurable. */}
      <div
        ref={scanRootRef}
        aria-hidden
        style={{ position: 'fixed', left: -99999, top: 0, width: SCAN_RENDER_WIDTH, pointerEvents: 'none', opacity: 0.01 }}
      >
        {spec.slides.map((slide, i) => (
          <div
            key={`${scanNonce}-${i}`}
            data-scan-index={i}
            style={{ width: SCAN_RENDER_WIDTH, height: SCAN_RENDER_HEIGHT, position: 'relative', overflow: 'hidden' }}
          >
            <SlideRenderer
              slide={slide}
              tokens={deck?.tokens}
              customAnimations={spec.meta?.customAnimations}
              active
              nonInteractive
            />
          </div>
        ))}
      </div>

      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
              <Stethoscope size={17} />
            </span>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
                Deck Doctor
              </h3>
              <p className="text-xs text-text-dim">
                {phase === 'scanning'
                  ? `Scanning ${totalSlides} slides…`
                  : `${totalSlides} slides scanned · ${issueCount} issue${issueCount === 1 ? '' : 's'} found`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {phase === 'scanning' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={28} className="animate-spin text-accent" />
              <span className="text-sm text-text-muted">
                Rendering and measuring every slide…
              </span>
            </div>
          )}

          {phase === 'report' && issueCount === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-sm font-semibold text-text">Your deck is clean!</p>
              <p className="text-xs text-text-dim max-w-sm">
                No overflow, overlaps or truncated text detected on any slide.
              </p>
              {fixedSummary && (
                <p className="text-xs text-emerald-400/80 mt-1">{fixedSummary}</p>
              )}
            </div>
          )}

          {phase === 'report' && issueCount > 0 && (
            <div className="flex flex-col gap-3">
              {fixedSummary && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Previous fix applied but issues remain: {fixedSummary}
                </div>
              )}
              {issues.map((s) => (
                <div key={s.slideIndex} className="rounded-xl border border-border bg-surface2/50 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-5 px-1.5 rounded-md bg-red-500/15 text-red-400 text-[11px] font-bold grid place-items-center">
                      {s.diagnostics.length + s.contentNotes.length}
                    </span>
                    <span className="text-xs font-semibold text-text">
                      Slide {s.slideIndex + 1}
                      <span className="text-text-dim font-normal">
                        {' '}· {spec.slides[s.slideIndex]?.layout}
                        {s.slideIndex === 0 ? '' : ''}
                      </span>
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {s.diagnostics.map((d, i) => (
                      <li key={`d${i}`} className="text-xs text-text-muted pl-3 border-l-2 border-red-500/40">
                        <span className="font-semibold text-red-400">{d.problem}</span> — {d.detail}
                      </li>
                    ))}
                    {s.contentNotes.map((note, i) => (
                      <li key={`n${i}`} className="text-xs text-text-muted pl-3 border-l-2 border-amber-500/40">
                        <span className="font-semibold text-amber-400">content</span> — {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'report' && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border shrink-0">
            <button
              onClick={() => setScanNonce((n) => n + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-text-dim hover:text-text cursor-pointer"
            >
              Re-scan
            </button>
            {issueCount > 0 && (
              <button
                onClick={fixWithAi}
                disabled={fixing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-accent to-accent2 text-white text-xs font-semibold shadow-md shadow-accent/30 hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {fixing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Fix {issueCount} issue{issueCount === 1 ? '' : 's'} with AI
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
