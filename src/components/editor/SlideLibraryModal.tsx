import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X, Trash2, Library } from 'lucide-react'
import { slideLibraryApi, ApiClientError, type LibrarySlide } from '../../lib/api'
import { useEditor } from './EditorContext'
import { useDeckTheme } from '../renderer/DeckThemeContext'
import SlideRenderer from '../renderer/SlideRenderer'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Personal slide library: browse slides you saved from any deck and insert
 * a copy into the current deck.
 */
export default function SlideLibraryModal({ open, onClose }: Props) {
  const { spec, addSlide, updateSlide } = useEditor()
  const deck = useDeckTheme()
  const { toast } = useToast()
  const [slides, setSlides] = useState<LibrarySlide[]>([])
  const [loading, setLoading] = useState(true)
  const [inserting, setInserting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    slideLibraryApi
      .list()
      .then((res) => {
        if (alive) setSlides(res.slides)
      })
      .catch((err) => {
        if (alive) toast.error(err instanceof ApiClientError ? err.message : 'Could not load your library')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open, toast])

  if (!open || !spec) return null

  const insert = (item: LibrarySlide) => {
    setInserting(item.id)
    // Append as a NEW slide (deep copy — a library insert is a template, never a live reference).
    const copy = JSON.parse(JSON.stringify(item.slide)) as typeof item.slide
    const newIndex = addSlide(copy.layout)
    if (newIndex >= 0) updateSlide(newIndex, { elements: copy.elements ?? [] })
    toast.success(`Inserted "${item.title || 'Untitled slide'}" as slide ${newIndex + 1}.`)
    onClose()
    setInserting(null)
  }

  const remove = async (id: string) => {
    try {
      await slideLibraryApi.remove(id)
      setSlides((s) => s.filter((x) => x.id !== id))
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Delete failed')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
              <Library size={17} />
            </span>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">Slide library</h3>
              <p className="text-xs text-text-dim">Slides you saved from any deck — click to insert a copy here.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={26} className="animate-spin text-accent" />
            </div>
          ) : slides.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Library size={32} className="text-text-dim" />
              <p className="text-sm text-text-muted">Your library is empty.</p>
              <p className="text-xs text-text-dim">
                Hover a slide thumbnail in the navigator, click ✨ and choose "Save to library".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slides.map((item) => (
                <div key={item.id} className="group relative rounded-xl border border-border overflow-hidden">
                  <button
                    className="w-full text-left cursor-pointer"
                    disabled={inserting !== null}
                    onClick={() => insert(item)}
                    title="Insert a copy into this deck"
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        background: deck?.tokens?.bg,
                      }}
                    >
                      <div
                        style={{
                          width: 1024,
                          height: 576,
                          transform: 'scale(0.187)',
                          transformOrigin: 'top left',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}
                      >
                        <SlideRenderer
                          slide={item.slide}
                          tokens={deck?.tokens}
                          customAnimations={spec.meta?.customAnimations}
                          active
                          nonInteractive
                        />
                      </div>
                    </div>
                    <div className="px-2 py-1.5 text-[11px] font-medium text-text-dim truncate">
                      {inserting === item.id ? 'Inserting…' : item.title || 'Untitled slide'}
                    </div>
                  </button>
                  <button
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/55 text-white/80 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all cursor-pointer"
                    title="Delete from library"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
