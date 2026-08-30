import { useState } from 'react'
import { Sparkles, BookmarkPlus } from 'lucide-react'
import { aiEditApi, ApiClientError, slideLibraryApi } from '../../lib/api'
import { useEditor } from './EditorContext'
import { useToast } from '../ui/Toast'
import RewritePreviewModal from './RewritePreviewModal'

const ACTIONS: { label: string; instruction: string }[] = [
  { label: 'Add animation', instruction: 'Add a tasteful entrance animation to the key elements of this slide (define a custom animation if the built-ins are not enough).' },
  { label: 'Densify', instruction: 'Make this slide richer: add meaningful, topic-specific content (statistics, cards or bullets as appropriate).' },
  { label: 'Simplify', instruction: 'Simplify this slide: fewer elements, shorter text, clearer message.' },
]

/**
 * Contextual AI actions on a slide thumbnail — one-click, no typing.
 * "Rewrite" opens a before/after preview; nothing is applied until kept.
 * Also saves the slide to the personal library.
 */
export default function SmartAiMenu({ slideIndex, presentationId }: { slideIndex: number; presentationId: string }) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const { spec, applyAiEdit } = useEditor()
  const { toast } = useToast()

  const run = async (action: { label: string; instruction: string }) => {
    setRunning(action.label)
    try {
      const res = await aiEditApi.run(presentationId, {
        instruction: action.instruction,
        target_indexes: [slideIndex],
      })
      applyAiEdit(res.spec)
      toast.success(res.summary || `${action.label} applied.`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'AI edit failed')
    } finally {
      setRunning(null)
    }
  }

  const saveToLibrary = async () => {
    const slide = spec?.slides[slideIndex]
    if (!slide) return
    const titleEl = slide.elements.find((e) => e.type === 'title')
    try {
      await slideLibraryApi.save((titleEl?.text as string) || `Slide ${slideIndex + 1}`, slide)
      toast.success('Slide saved to your library.')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save the slide')
    }
  }

  return (
    <div className="relative">
      <button
        className="w-6 h-6 rounded-md bg-black/55 text-white grid place-items-center hover:bg-accent transition-colors cursor-pointer"
        title="AI actions on this slide"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <Sparkles size={12} />
      </button>
      {open && (
        <>
          {/* click-away layer */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-surface shadow-xl shadow-black/30 p-1">
            <button
              disabled={running !== null}
              onClick={() => {
                setOpen(false)
                setRewriteOpen(true)
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-surface2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              ✨ Rewrite (preview)
            </button>
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                disabled={running !== null}
                onClick={() => run(a)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-surface2 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {running === a.label ? 'Working…' : a.label}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              disabled={running !== null}
              onClick={saveToLibrary}
              className="w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 rounded-lg text-xs text-text-dim hover:bg-surface2 hover:text-text disabled:opacity-50 transition-colors cursor-pointer"
            >
              <BookmarkPlus size={12} />
              Save to library
            </button>
          </div>
        </>
      )}

      <RewritePreviewModal
        open={rewriteOpen}
        onClose={() => setRewriteOpen(false)}
        presentationId={presentationId}
        slideIndex={slideIndex}
        instruction={`Rewrite this slide: punchier title, more specific and impactful content, better composition. Keep the slide's topic and overall design language.`}
        actionLabel="Magic rewrite"
      />
    </div>
  )
}
