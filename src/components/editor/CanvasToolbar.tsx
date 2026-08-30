import { useState } from 'react'
import { Heading1, Type, List, Quote, ImagePlus, Copy, Trash2, ArrowUpToLine, Wand2, AlignLeft, AlignCenter, AlignRight, Palette, Square, Circle, Minus, MoveRight, Video, Music, Table2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useEditor } from './EditorContext'
import ImagePickerModal from './ImagePickerModal'
import { convertSlideToCustom } from '../../lib/convertToCustom'
import { useDeckTheme } from '../renderer/DeckThemeContext'
import type { SpecElement, LayoutName } from '../../types'

const LAYOUTS: LayoutName[] = [
  'blank', 'title', 'hero', 'section', 'agenda', 'bullets', 'numbered-list',
  'cards', 'statistics', 'comparison', 'timeline', 'process', 'flow', 'roadmap',
  'table', 'chart', 'pricing', 'team', 'quote', 'swot', 'image-left', 'image-right',
  'gallery', 'two-column', 'big-stat', 'cta', 'conclusion', 'thank-you', 'custom',
] as LayoutName[]

// Built-in element animations (mirrors components/renderer/animations.ts) that
// users can assign from the toolbar; deck custom animations are appended.
const BUILT_IN_ANIMATIONS = [
  'fade', 'slide', 'scale', 'zoom', 'rotate', 'blur',
  'reveal', 'typing', 'counter', 'gradient', 'parallax', 'sequential',
] as const

function btnClass(active = false): string {
  return cn(
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border',
    active
      ? 'border-accent/50 bg-accent/10 text-accent'
      : 'border-transparent text-text-dim hover:text-text hover:bg-surface2 hover:border-border',
  )
}

/**
 * Canvas-top toolbar for manual (Canva-style) editing:
 *  - Insert: adds free-positioned elements (text, list, quote, image).
 *  - Selection actions: animation picker, duplicate, bring-to-front, delete.
 */
export default function CanvasToolbar({ slideIndex }: { slideIndex: number }) {
  const editor = useEditor()
  const { spec, selection, addElement, updateElement, duplicateElement, deleteElement, updateSlide } = editor
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [mediaPicker, setMediaPicker] = useState<'video' | 'audio' | null>(null)
  const [chartEditorOpen, setChartEditorOpen] = useState(false)
  const deck = useDeckTheme()

  if (!spec) return null
  const slide = spec.slides[slideIndex]
  if (!slide) return null

  const selectedIdx =
    selection && selection.slideIndex === slideIndex ? selection.elementIndex : null
  const selectedElement = selectedIdx != null ? slide.elements[selectedIdx] : null

  // Position new elements with a small cascade so they never stack exactly.
  const insertBase = () => {
    const count = slide.elements.filter((el) => el.x != null && el.y != null).length
    return { x: 10 + (count % 3) * 4, y: Math.min(70, 12 + count * 6) }
  }

  const insert = (partial: Partial<SpecElement> & { type: SpecElement['type'] }) => {
    const el: SpecElement = { ...insertBase(), ...partial } as SpecElement
    addElement(slideIndex, el)
  }

  const customAnims = (spec.meta.customAnimations ?? [])
    .map((d) => d.name)
    .filter(Boolean)

  return (
    <div className="relative flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border border-border bg-surface/80 backdrop-blur-md shadow-sm">
      {/* Insert */}
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim px-1">
        Insert
      </span>
      <button className={btnClass()} onClick={() => insert({ type: 'title', text: '', level: 2, w: 70 })} title="Add a heading">
        <Heading1 size={14} />
        Heading
      </button>
      <button className={btnClass()} onClick={() => insert({ type: 'paragraph', text: '', w: 55 })} title="Add a text box">
        <Type size={14} />
        Text
      </button>
      <button
        className={btnClass()}
        onClick={() => insert({ type: 'bullets', items: ['First point', 'Second point', 'Third point'], w: 50 })}
        title="Add a list"
      >
        <List size={14} />
        List
      </button>
      <button className={btnClass()} onClick={() => insert({ type: 'quote', text: '', author: '', w: 60 })} title="Add a quote">
        <Quote size={14} />
        Quote
      </button>
      <button className={btnClass()} onClick={() => setImagePickerOpen(true)} title="Upload or pick an image">
        <ImagePlus size={14} />
        Image
      </button>
      <button className={btnClass()} onClick={() => setMediaPicker('video')} title="Upload a video (mp4/webm)">
        <Video size={14} />
        Video
      </button>
      <button className={btnClass()} onClick={() => setMediaPicker('audio')} title="Upload an audio track (mp3/wav)">
        <Music size={14} />
        Audio
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      {([
        ['rect', Square, 'Rectangle'],
        ['circle', Circle, 'Circle'],
        ['line', Minus, 'Line'],
        ['arrow', MoveRight, 'Arrow'],
      ] as const).map(([shape, Icon, label]) => (
        <button
          key={shape}
          className={btnClass()}
          title={`Add ${label.toLowerCase()}`}
          onClick={() => {
            const tk = deck?.tokens
            insert({ type: 'shape', shape, fill: tk?.accent ?? '#ea580c', x: 55, y: 15 + (slide.elements.length % 5) * 5, w: 20, h: 18 })
          }}
        >
          <Icon size={14} />
        </button>
      ))}

      {/* Slide-level: layout + convert */}
      <span className="mx-1 h-5 w-px bg-border" />
      <label className={cn(btnClass(), 'gap-1.5')} title="Slide layout">
        <select
          value={slide.layout}
          onChange={(e) => updateSlide(slideIndex, { layout: e.target.value as LayoutName })}
          className="bg-transparent outline-none cursor-pointer text-xs max-w-[120px]"
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
      {slide.layout !== 'custom' && (
        <button
          className={btnClass()}
          title="Convert this slide into a custom-coded slide you (or the AI) can edit freely"
          onClick={() => {
            const tk = deck?.tokens
            if (!tk) return
            updateSlide(slideIndex, convertSlideToCustom(slide, {
              bg: tk.bg, text: tk.text, textMuted: tk.textMuted,
              accent: tk.accent, accent2: tk.accent2, gradient: tk.gradient,
              fontHeading: tk.fontHeading, fontBody: tk.fontBody,
            }))
          }}
        >
          <Wand2 size={14} />
          To custom
        </button>
      )}

      {/* Selection actions */}
      {selectedElement && selectedIdx != null && (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim px-1">
            Element
          </span>
          <label className={cn(btnClass(), 'gap-1.5')} title="Entrance animation">
            <Wand2 size={14} />
            <select
              value={selectedElement.animation ?? ''}
              onChange={(e) =>
                updateElement(slideIndex, selectedIdx, {
                  animation: e.target.value || null,
                })
              }
              className="bg-transparent outline-none cursor-pointer text-xs max-w-[110px]"
            >
              <option value="">No animation</option>
              <optgroup label="Built-in">
                {BUILT_IN_ANIMATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </optgroup>
              {customAnims.length > 0 && (
                <optgroup label="Custom">
                  {customAnims.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <button
            className={btnClass()}
            title="Duplicate"
            onClick={() => duplicateElement(slideIndex, selectedIdx)}
          >
            <Copy size={14} />
          </button>
          {/* Style overrides (ElementStyle) */}
          <label className={cn(btnClass(), 'cursor-pointer relative')} title="Element color">
            <Palette size={14} />
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(selectedElement.style?.color ?? '') ? selectedElement.style!.color! : '#1c1917'}
              onChange={(e) =>
                updateElement(slideIndex, selectedIdx, {
                  style: { ...selectedElement.style, color: e.target.value },
                })
              }
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          <input
            type="number"
            min={8}
            max={200}
            value={parseInt(selectedElement.style?.fontSize ?? '', 10) || ''}
            placeholder="px"
            title="Font size (px) — text elements"
            onChange={(e) => {
              const v = Number(e.target.value)
              updateElement(slideIndex, selectedIdx, {
                style: { ...selectedElement.style, fontSize: e.target.value ? `${v}px` : undefined },
              })
            }}
            className="w-14 h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text cursor-text"
          />
          {(['left', 'center', 'right'] as const).map((a) => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
            const activeAlign = selectedElement.style?.align === a
            return (
              <button
                key={a}
                className={btnClass(activeAlign)}
                title={`Align ${a}`}
                onClick={() =>
                  updateElement(slideIndex, selectedIdx, {
                    style: { ...selectedElement.style, align: selectedElement.style?.align === a ? undefined : a },
                  })
                }
              >
                <Icon size={14} />
              </button>
            )
          })}
          <input
            type="range"
            min={20}
            max={100}
            value={Math.round((selectedElement.style?.opacity ?? 1) * 100)}
            title={`Opacity ${Math.round((selectedElement.style?.opacity ?? 1) * 100)}%`}
            onChange={(e) =>
              updateElement(slideIndex, selectedIdx, {
                style: { ...selectedElement.style, opacity: Number(e.target.value) / 100 },
              })
            }
            className="w-16 accent-[var(--accent)] cursor-pointer"
          />
          <button
            className={btnClass()}
            title="Bring to front"
            onClick={() => {
              const idx = selectedIdx
              const el = slide.elements[idx]
              const elements = slide.elements.filter((_, i) => i !== idx)
              elements.push(el)
              updateSlide(slideIndex, { elements })
            }}
          >
            <ArrowUpToLine size={14} />
          </button>
          {selectedElement.type === 'image' && (
            <>
              <button
                className={btnClass(selectedElement.flip)}
                title="Mirror horizontally"
                onClick={() =>
                  updateElement(slideIndex, selectedIdx, { flip: !selectedElement.flip })
                }
              >
                ⇋
              </button>
              <select
                value={selectedElement.objectPosition ?? ''}
                title="Image focus (object-position)"
                onChange={(e) =>
                  updateElement(slideIndex, selectedIdx, { objectPosition: e.target.value || undefined })
                }
                className="bg-transparent outline-none cursor-pointer text-xs text-text-dim"
              >
                <option value="">Focus</option>
                <option value="center top">Top</option>
                <option value="center">Center</option>
                <option value="center bottom">Bottom</option>
              </select>
            </>
          )}
          {selectedElement.type === 'statistics' && (
            <button
              className={btnClass(chartEditorOpen)}
              title="Edit chart data"
              onClick={() => setChartEditorOpen((v) => !v)}
            >
              <Table2 size={14} />
              Data
            </button>
          )}
          <button
            className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete element"
            onClick={() => deleteElement(slideIndex, selectedIdx)}
          >
            <Trash2 size={14} />
          </button>
        </>
      )}

      {imagePickerOpen && (
        <ImagePickerModal
          open={imagePickerOpen}
          onClose={() => setImagePickerOpen(false)}
          onInsert={(src, alt, fileId) => {
            insert({ type: 'image', src, alt, fileId, w: 40 })
            setImagePickerOpen(false)
          }}
        />
      )}
      {mediaPicker && (
        <ImagePickerModal
          open
          accept={mediaPicker}
          title={mediaPicker === 'video' ? 'Insert video' : 'Insert audio'}
          onClose={() => setMediaPicker(null)}
          onInsert={(src, alt, fileId) => {
            if (mediaPicker === 'video') {
              insert({ type: 'video', src, alt, fileId, w: 45 })
            } else {
              insert({ type: 'audio', src, alt, fileId })
            }
            setMediaPicker(null)
          }}
        />
      )}
      {chartEditorOpen && selectedElement && selectedElement.type === 'statistics' && selectedIdx != null && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-40 w-[min(420px,90vw)] rounded-xl border border-border bg-surface shadow-xl shadow-black/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text">Chart data</span>
            <button
              className="text-xs text-accent cursor-pointer"
              onClick={() =>
                updateElement(slideIndex, selectedIdx, {
                  items: [...(selectedElement.items ?? []), { value: '', label: '' }],
                })
              }
            >
              + row
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {(selectedElement.items ?? []).map((item: { value?: string; label?: string }, ri: number) => (
              <div key={ri} className="flex items-center gap-1.5">
                <input
                  value={item.value ?? ''}
                  placeholder="42"
                  onChange={(e) => {
                    const items = [...(selectedElement.items ?? [])]
                    items[ri] = { ...item, value: e.target.value }
                    updateElement(slideIndex, selectedIdx, { items })
                  }}
                  className="w-16 h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text"
                />
                <input
                  value={item.label ?? ''}
                  placeholder="Label"
                  onChange={(e) => {
                    const items = [...(selectedElement.items ?? [])]
                    items[ri] = { ...item, label: e.target.value }
                    updateElement(slideIndex, selectedIdx, { items })
                  }}
                  className="flex-1 h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text"
                />
                <button
                  className="text-xs text-red-400 px-1 cursor-pointer"
                  title="Remove row"
                  onClick={() => {
                    const items = (selectedElement.items ?? []).filter((_: unknown, k: number) => k !== ri)
                    updateElement(slideIndex, selectedIdx, { items })
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
