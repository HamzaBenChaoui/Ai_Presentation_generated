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
// Snap distance (in % of slide) for smart guides.
const SNAP = 0.9

const clampPos = (v: number) => Math.min(MAX_POS, Math.max(MIN_POS, v))

/**
 * Renders elements that carry free Canvas-style placement (x/y in percent of
 * the slide) as floating overlays above the layout. In the editor they can be
 * selected (shift-click multi-select), dragged together (multi-move), snapped
 * to smart alignment guides, and resized. In present/shared mode the layer is
 * fully inert.
 *
 * Gestures update a local visual offset and commit ONE spec change on
 * pointer-up, so a single gesture is a single undo entry.
 */
export default function FreeElementLayer({ slide, tokens = defaultTokens, active = true, forceStatic = false }: Props) {
  const editor = useOptionalEditor()
  const slideIndex = useActiveSlideIndex()
  const editing = editor?.editing === true && !forceStatic

  const containerRef = useRef<HTMLDivElement>(null)

  // --- drag state: indexes + per-index origin/base positions ---
  const [drag, setDrag] = useState<{ indexes: number[]; dx: number; dy: number } | null>(null)
  const dragOrigin = useRef<{ px: number; py: number; bases: Map<number, { x: number; y: number }> } | null>(null)

  // --- resize state (index + visual width in percent) ---
  const [resize, setResize] = useState<{ index: number; w: number } | null>(null)
  const resizeOrigin = useRef<number>(0)

  // --- smart guides currently snapped (positions in %) ---
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })

  const selectedIndexes = editor?.selectedIndexes ?? []

  const startDrag = useCallback(
    (e: React.PointerEvent, el: SpecElement, index: number) => {
      if (!editor || !editing) return
      if (el.locked) return
      e.stopPropagation()
      // Already part of a multi-selection? drag everyone. Otherwise select it.
      const moving = selectedIndexes.includes(index) ? selectedIndexes : [index]
      if (!selectedIndexes.includes(index)) editor.setSelection({ slideIndex, elementIndex: index })
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const bases = new Map<number, { x: number; y: number }>()
      for (const idx of moving) {
        const target = slide.elements[idx]
        if (target && !target.locked && target.x != null && target.y != null) {
          bases.set(idx, { x: target.x, y: target.y })
        }
      }
      if (!bases.size) return
      dragOrigin.current = { px: e.clientX, py: e.clientY, bases }
      setDrag({ indexes: [...bases.keys()], dx: 0, dy: 0 })
    },
    [editor, editing, slideIndex, selectedIndexes, slide.elements],
  )

  const startResize = useCallback(
    (e: React.PointerEvent, el: SpecElement, index: number) => {
      if (!editor || !editing || el.locked) return
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

    const snapTargets = () => {
      const xs: number[] = [50, 0, 100]
      const ys: number[] = [50]
      for (const item of positioned) {
        if (drag?.indexes.includes(item.index)) continue
        const w = item.el.w ?? 40
        const h = item.el.h ?? 20
        xs.push(item.el.x ?? 0, (item.el.x ?? 0) + w / 2, (item.el.x ?? 0) + w)
        ys.push(item.el.y ?? 0, (item.el.y ?? 0) + h / 2, (item.el.y ?? 0) + h)
      }
      return { xs, ys }
    }

    const onMove = (e: PointerEvent) => {
      const r = rect()
      if (!r) return
      if (drag && dragOrigin.current) {
        const dx = ((e.clientX - dragOrigin.current.px) / r.width) * 100
        const dy = ((e.clientY - dragOrigin.current.py) / r.height) * 100
        setDrag({ ...drag, dx, dy })

        // Smart guides: snap the PRIMARY element's left/center/right and
        // top/middle/bottom to other elements + the slide's own lines.
        const primary = drag.indexes[0]
        const base = dragOrigin.current.bases.get(primary)
        if (base) {
          const el = slide.elements[primary]
          const w = el?.w ?? 40
          const h = el?.h ?? 20
          const { xs, ys } = snapTargets()
          const myXs = [base.x + dx, base.x + dx + w / 2, base.x + dx + w]
          const myYs = [base.y + dy, base.y + dy + h / 2, base.y + dy + h]
          let gx: number[] = []
          let gy: number[] = []
          let sdx = dx
          let sdy = dy
          for (const target of xs) {
            for (const mine of myXs) {
              if (Math.abs(mine - target) < SNAP) {
                sdx = dx + (target - mine)
                gx = [target]
                break
              }
            }
            if (gx.length) break
          }
          for (const target of ys) {
            for (const mine of myYs) {
              if (Math.abs(mine - target) < SNAP) {
                sdy = dy + (target - mine)
                gy = [target]
                break
              }
            }
            if (gy.length) break
          }
          if (sdx !== dx || sdy !== dy) setDrag({ ...drag, dx: sdx, dy: sdy })
          setGuides(gx.length || gy.length ? { x: gx, y: gy } : { x: [], y: [] })
        }
      } else if (resize) {
        const dw = ((e.clientX - resizeOrigin.current) / r.width) * 100
        setResize({ ...resize, w: Math.min(100, Math.max(5, resize.w + dw)) })
      }
    }

    const onUp = () => {
      if (drag && dragOrigin.current && editor) {
        const first = drag.indexes[0]
        const base = dragOrigin.current.bases.get(first)
        if (base) {
          const nx = clampPos(Math.round((base.x + drag.dx) * 10) / 10)
          const ny = clampPos(Math.round((base.y + drag.dy) * 10) / 10)
          if (nx !== base.x || ny !== base.y) {
            // Multi-move commits as ONE updateSlide → ONE undo entry.
            const elements = slide.elements.map((el, i) => {
              const b = dragOrigin.current?.bases.get(i)
              if (!b || !drag.indexes.includes(i)) return el
              return {
                ...el,
                x: clampPos(Math.round((b.x + drag.dx) * 10) / 10),
                y: clampPos(Math.round((b.y + drag.dy) * 10) / 10),
              }
            })
            editor.updateSlide(slideIndex, { elements })
          }
        }
      } else if (resize && editor) {
        editor.updateElement(slideIndex, resize.index, { w: Math.round(resize.w * 10) / 10 })
      }
      setDrag(null)
      setResize(null)
      setGuides({ x: [], y: [] })
      dragOrigin.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, resize, editor, slideIndex, slide.elements])

  const positioned = slide.elements
    .map((el, index) => ({ el, index }))
    .filter(({ el }) => el.x != null && el.y != null)

  if (positioned.length === 0) return null

  const isSelectedIndex = (index: number) =>
    editing && selectedIndexes.includes(index)

  return (
    <div
      ref={containerRef}
      data-free-layer
      // Full-slide overlay that never intercepts the pointer itself; the
      // positioned children re-enable it in edit mode.
      style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
    >
      {/* Smart alignment guides (shown only while snapping during a drag). */}
      {editing && (guides.x.length > 0 || guides.y.length > 0) && (
        <>
          {guides.x.map((gx) => (
            <div
              key={`gx-${gx}`}
              style={{
                position: 'absolute',
                left: `${gx}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: '#ec4899',
                opacity: 0.85,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          ))}
          {guides.y.map((gy) => (
            <div
              key={`gy-${gy}`}
              style={{
                position: 'absolute',
                top: `${gy}%`,
                left: 0,
                right: 0,
                height: 1,
                background: '#ec4899',
                opacity: 0.85,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          ))}
        </>
      )}
      {positioned.map(({ el, index }) => {
        const isSelected = isSelectedIndex(index)
        const dragging = drag?.indexes.includes(index)
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
              if (e.shiftKey) {
                e.stopPropagation()
                editor.toggleMultiSelect(slideIndex, index)
                return
              }
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
              cursor: editing ? (el.locked ? 'default' : 'grab') : undefined,
              opacity: el.locked && editing ? 0.85 : undefined,
            }}
          >
            <AnimatedElement el={el} index={index} tokens={tokens} active={active} />

            {isSelected && !el.locked && (
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
                {/* Resize handle for images + charts. */}
                {(el.type === 'image' || el.type === 'chart') && (
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
            {isSelected && el.locked && (
              <div
                title="Locked — unlock in the toolbar"
                style={{
                  position: 'absolute',
                  top: -26,
                  left: -2,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fbbf24',
                  fontSize: 12,
                }}
              >
                🔒
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
