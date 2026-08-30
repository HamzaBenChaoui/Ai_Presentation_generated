import { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal } from 'lucide-react'
import type { SlideSpec, SpecElement } from '../../types'
import type { RenderTokens } from './theme'
import { defaultTokens } from './theme'
import AnimatedElement from './AnimatedElement'
import { useOptionalEditor } from '../editor/EditorContext'
import { useActiveSlideIndex } from './ElementRenderer'

interface Props {
  slide: SlideSpec
  tokens?: RenderTokens
  active?: boolean
  // When true the layer renders content only — no selection chrome, no
  // pointer interaction (used by slide thumbnails).
  forceStatic?: boolean
}

const MIN_POS = 0
const MAX_POS = 96

const clampPos = (v: number) => Math.min(MAX_POS, Math.max(MIN_POS, v))

/**
 * Renders elements that carry free Canvas-style placement (x/y in percent of
 * the slide) as floating overlays above the layout. In the editor they can be
 * selected, dragged (via the grip) and resized (bottom-right handle on
 * images); in present/shared mode the layer is fully inert.
 *
 * Drag/resize update a local visual offset and commit ONE spec change on
 * pointer-up, so a single gesture is a single undo entry.
 */
export default function FreeElementLayer({ slide, tokens = defaultTokens, active = true, forceStatic = false }: Props) {
  const editor = useOptionalEditor()
  const slideIndex = useActiveSlideIndex()
  const editing = editor?.editing === true && !forceStatic

  const containerRef = useRef<HTMLDivElement>(null)

  // --- drag state (index + visual offset in percent) ---
  const [drag, setDrag] = useState<{ index: number; dx: number; dy: number } | null>(null)
  const dragOrigin = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  // --- resize state (index + visual width in percent) ---
  const [resize, setResize] = useState<{ index: number; w: number } | null>(null)
  const resizeOrigin = useRef<number>(0)

  const startDrag = useCallback(
    (e: React.PointerEvent, el: SpecElement, index: number) => {
      if (!editor || !editing) return
      e.stopPropagation()
      editor.setSelection({ slideIndex, elementIndex: index })
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      dragOrigin.current = { px: e.clientX, py: e.clientY, x: el.x ?? 0, y: el.y ?? 0 }
      setDrag({ index, dx: 0, dy: 0 })
    },
    [editor, editing, slideIndex],
  )

  const startResize = useCallback(
    (e: React.PointerEvent, el: SpecElement, index: number) => {
      if (!editor || !editing) return
      e.stopPropagation()
      editor.setSelection({ slideIndex, elementIndex: index })
      resizeOrigin.current = e.clientX
      setResize({ index, w: el.w ?? 40 })
    },
    [editor, editing, slideIndex],
  )

  // Global move/up listeners for the active gesture.
  useEffect(() => {
    if (!drag && !resize) return

    const rect = () => containerRef.current?.getBoundingClientRect()

    const onMove = (e: PointerEvent) => {
      const r = rect()
      if (!r) return
      if (drag && dragOrigin.current) {
        const dx = ((e.clientX - dragOrigin.current.px) / r.width) * 100
        const dy = ((e.clientY - dragOrigin.current.py) / r.height) * 100
        setDrag({ ...drag, dx, dy })
      } else if (resize) {
        const dw = ((e.clientX - resizeOrigin.current) / r.width) * 100
        setResize({ ...resize, w: Math.min(100, Math.max(5, resize.w + dw)) })
      }
    }

    const onUp = () => {
      if (drag && dragOrigin.current && editor) {
        const nx = clampPos(Math.round((dragOrigin.current.x + drag.dx) * 10) / 10)
        const ny = clampPos(Math.round((dragOrigin.current.y + drag.dy) * 10) / 10)
        if (nx !== dragOrigin.current.x || ny !== dragOrigin.current.y) {
          editor.updateElement(slideIndex, drag.index, { x: nx, y: ny })
        }
      } else if (resize && editor) {
        editor.updateElement(slideIndex, resize.index, { w: Math.round(resize.w * 10) / 10 })
      }
      setDrag(null)
      setResize(null)
      dragOrigin.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, resize, editor, slideIndex])

  const positioned = slide.elements
    .map((el, index) => ({ el, index }))
    .filter(({ el }) => el.x != null && el.y != null)

  if (positioned.length === 0) return null

  const currentSelection = editor?.selection ?? null

  return (
    <div
      ref={containerRef}
      data-free-layer
      // Full-slide overlay that never intercepts the pointer itself; the
      // positioned children re-enable it in edit mode.
      style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
    >
      {positioned.map(({ el, index }) => {
        const isSelected =
          editing && currentSelection?.slideIndex === slideIndex && currentSelection?.elementIndex === index
        const dragging = drag?.index === index
        const resizing = resize?.index === index
        const x = el.x ?? 0
        const y = el.y ?? 0
        const w = resizing ? resize!.w : el.w
        return (
          <div
            key={index}
            data-free-el={index}
            onPointerDown={(e) => {
              if (!editor || !editing) return
              // Let text editing inside the element win (double-click → caret).
              if (e.target instanceof HTMLElement && e.target.isContentEditable) return
              editor.setSelection({ slideIndex, elementIndex: index })
            }}
            style={{
              position: 'absolute',
              left: `${clampPos(x + (dragging ? drag!.dx : 0))}%`,
              top: `${clampPos(y + (dragging ? drag!.dy : 0))}%`,
              width: w != null ? `${w}%` : undefined,
              maxWidth: w != null ? undefined : '90%',
              pointerEvents: editing ? 'auto' : 'none',
              outline: isSelected ? `2px solid ${tokens.accent}` : undefined,
              outlineOffset: 2,
              borderRadius: 4,
              userSelect: dragging || resizing ? 'none' : undefined,
              touchAction: 'none',
            }}
          >
            <AnimatedElement el={el} index={index} tokens={tokens} active={active} />

            {isSelected && (
              <>
                {/* Drag grip — text elements stay click-to-edit, drag from here. */}
                <div
                  onPointerDown={(e) => startDrag(e, el, index)}
                  title="Drag to move"
                  style={{
                    position: 'absolute',
                    top: -26,
                    left: -2,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                >
                  <GripHorizontal size={14} />
                </div>
                {/* Resize handle for images. */}
                {el.type === 'image' && (
                  <div
                    onPointerDown={(e) => startResize(e, el, index)}
                    title="Drag to resize"
                    style={{
                      position: 'absolute',
                      right: -6,
                      bottom: -6,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: tokens.accent,
                      border: '2px solid #fff',
                      cursor: 'nwse-resize',
                      touchAction: 'none',
                    }}
                  />
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
