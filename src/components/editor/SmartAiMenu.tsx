import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiEditApi, ApiClientError } from '../../lib/api'
import { useEditor } from './EditorContext'
import { useToast } from '../ui/Toast'

const ACTIONS: { label: string; instruction: string }[] = [
  { label: 'Rewrite this slide', instruction: 'Rewrite this slide: punchier title, more specific and impactful content. Keep the layout.' },
  { label: 'Add animation', instruction: 'Add a tasteful entrance animation to the key elements of this slide (define a custom animation if the built-ins are not enough).' },
  { label: 'Densify', instruction: 'Make this slide richer: add meaningful, topic-specific content (statistics, cards or bullets as appropriate).' },
  { label: 'Simplify', instruction: 'Simplify this slide: fewer elements, shorter text, clearer message.' },
]

/**
 * Contextual AI actions on a slide thumbnail — one-click, no typing.
 * Uses the existing AI-edit endpoint restricted to that slide's index.
 */
export default function SmartAiMenu({ slideIndex, presentationId }: { slideIndex: number; presentationId: string }) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const { applyAiEdit } = useEditor()
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
          </div>
        </>
      )}
    </div>
  )
}
