import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X, Check, Trash2 } from 'lucide-react'
import { aiEditApi } from '../../lib/api'
import { useEditor } from './EditorContext'
import { useDeckTheme } from '../renderer/DeckThemeContext'
import SlideRenderer from '../renderer/SlideRenderer'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
  presentationId: string
  slideIndex: number
  instruction: string
  actionLabel: string
}

/**
 * Magic Rewrite — runs an AI edit scoped to one slide and shows the result
 * side-by-side with the original. Nothing touches the deck until you keep it.
 */
export default function RewritePreviewModal({ open, onClose, presentationId, slideIndex, instruction, actionLabel }: Props) {
  const { spec, applyAiEdit } = useEditor()
  const deck = useDeckTheme()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [newSlide, setNewSlide] = useState<import('../../types').SlideSpec | null>(null)
  const [newSpec, setNewSpec] = useState<import('../../types').PresentationSpec | null>(null)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setNewSlide(null)
    setNewSpec(null)
    aiEditApi
      .run(presentationId, { instruction, target_indexes: [slideIndex] })
      .then((res) => {
        if (!alive) return
        const candidate = res.spec.slides[slideIndex]
        if (!candidate) {
          toast.error('The AI returned an unexpected result.')
          onClose()
          return
        }
        setNewSlide(candidate)
        setNewSpec(res.spec)
        setSummary(res.summary || `${actionLabel} ready.`)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        toast.error(err instanceof Error ? err.message : 'AI edit failed')
        onClose()
      })
    return () => {
      alive = false
    }
  }, [open, presentationId, slideIndex, instruction, actionLabel, toast, onClose])

  if (!open || !spec) return null

  const oldSlide = spec.slides[slideIndex]
  const tokens = deck?.tokens

  const preview = (slide: import('../../types').SlideSpec) => (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.14)',
        position: 'relative',
        pointerEvents: 'none',
        background: tokens?.bg,
      }}
    >
      <div
        style={{
          width: 1024,
          height: 576,
          transform: 'scale(0.28)',
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <SlideRenderer slide={slide} tokens={tokens} customAnimations={spec.meta?.customAnimations} active nonInteractive />
      </div>
    </div>
  )

  const keep = () => {
    if (newSpec) applyAiEdit(newSpec)
    toast.success('New version applied.')
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={loading ? undefined : onClose}>
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
              {actionLabel} — slide {slideIndex + 1}
            </h3>
            <p className="text-xs text-text-dim mt-0.5">{loading ? 'Slide AI is working…' : summary}</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text cursor-pointer p-1" title="Discard">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 size={28} className="animate-spin text-accent" />
            <span className="text-sm text-text-muted">Rewriting the slide…</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">Before</span>
                <div className="mt-1">{oldSlide && preview(oldSlide)}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">After</span>
                <div className="mt-1">{newSlide && preview(newSlide)}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-text-dim hover:text-text cursor-pointer"
              >
                <Trash2 size={13} />
                Discard
              </button>
              <button
                onClick={keep}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-accent to-accent2 text-white text-xs font-semibold shadow-md shadow-accent/30 hover:opacity-90 cursor-pointer"
              >
                <Check size={13} />
                Keep new version
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
