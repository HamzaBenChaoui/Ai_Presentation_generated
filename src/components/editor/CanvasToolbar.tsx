import { useState } from 'react'
import { Heading1, Type, List, Quote, ImagePlus, Copy, Trash2, ArrowUpToLine, ArrowDownToLine, Lock, LockOpen, Wand2, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Palette, Square, Circle, Minus, MoveRight, Video, Music, Table2, BarChart3 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useEditor } from './EditorContext'
import ImagePickerModal from './ImagePickerModal'
import { convertSlideToCustom } from '../../lib/convertToCustom'
import { useDeckTheme } from '../renderer/DeckThemeContext'
import SlideLibraryModal from './SlideLibraryModal'
import { Library } from 'lucide-react'
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
  const { spec, selection, addElement, updateElement, duplicateElement, updateSlide } = editor
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [mediaPicker, setMediaPicker] = useState<'video' | 'audio' | null>(null)
  const [chartEditorOpen, setChartEditorOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
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

  // --- multi-select helpers --------------------------------------------------
  const multiCount = editor.selectedIndexes.length

  /** Align every selected free element (one undo entry). */
  const alignSelected = (mode: 'left' | 'center-x' | 'right' | 'top' | 'middle' | 'bottom') => {
    const idxs = editor.selectedIndexes.filter((i) => {
      const el = slide.elements[i]
      return el && el.x != null && el.y != null && !el.locked
    })
    if (idxs.length < 2) return
    const boxes = idxs.map((i) => {
      const el = slide.elements[i]
      const w = el.w ?? 40
      const h = el.h ?? 20
      return { i, x: el.x ?? 0, y: el.y ?? 0, w, h }
    })
    const minX = Math.min(...boxes.map((b) => b.x))
    const maxX = Math.max(...boxes.map((b) => b.x + b.w))
    const minY = Math.min(...boxes.map((b) => b.y))
    const maxY = Math.max(...boxes.map((b) => b.y + b.h))
    const elements = slide.elements.map((el, i) => {
      const b = boxes.find((box) => box.i === i)
      if (!b) return el
      let { x, y } = b
      if (mode === 'left') x = minX
      if (mode === 'center-x') x = minX + (maxX - minX) / 2 - b.w / 2
      if (mode === 'right') x = maxX - b.w
      if (mode === 'top') y = minY
      if (mode === 'middle') y = minY + (maxY - minY) / 2 - b.h / 2
      if (mode === 'bottom') y = maxY - b.h
      return { ...el, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
    })
    updateSlide(slideIndex, { elements })
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border border-border bg-surface/80 backdrop-blur-md shadow-sm">
      {/* Insert */}
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim px-1">
        Insert
      </span>
      <button className={btnClass()} onClick={() => setLibraryOpen(true)} title="Insert a slide saved in your library">
        <Library size={14} />
        Library
      </button>
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
      <button
        className={btnClass()}
        title="Add a native chart (bar/line/pie…)"
        onClick={() => {
          insert({
            type: 'chart',
            chartType: 'bar',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{ label: 'Series 1', data: [12, 19, 8, 15] }],
            w: 45,
            h: 42,
          })
          setChartEditorOpen(true)
        }}
      >
        <BarChart3 size={14} />
        Chart
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
              editor.setSelection({ slideIndex, elementIndex: elements.length - 1 })
            }}
          >
            <ArrowUpToLine size={14} />
          </button>
          <button
            className={btnClass()}
            title="Send to back"
            onClick={() => {
              const idx = selectedIdx
              const el = slide.elements[idx]
              const elements = slide.elements.filter((_, i) => i !== idx)
              elements.unshift(el)
              updateSlide(slideIndex, { elements })
              editor.setSelection({ slideIndex, elementIndex: 0 })
            }}
          >
            <ArrowDownToLine size={14} />
          </button>
          <button
            className={btnClass(!!selectedElement.locked)}
            title={selectedElement.locked ? 'Unlock element' : 'Lock element (no move/resize/delete)'}
            onClick={() => updateElement(slideIndex, selectedIdx, { locked: !selectedElement.locked })}
          >
            {selectedElement.locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
          {multiCount > 1 && (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent px-1">
                {multiCount} selected
              </span>
              {([
                ['left', AlignStartVertical],
                ['center-x', AlignCenterVertical],
                ['right', AlignEndVertical],
                ['top', AlignStartHorizontal],
                ['middle', AlignCenterHorizontal],
                ['bottom', AlignEndHorizontal],
              ] as const).map(([mode, Icon]) => (
                <button
                  key={mode}
                  className={btnClass()}
                  title={`Align ${mode}`}
                  onClick={() => alignSelected(mode)}
                >
                  <Icon size={14} />
                </button>
              ))}
            </>
          )}
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
          {selectedElement.type === 'chart' && (
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
            className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedElement.locked ? 'Locked — unlock first' : 'Delete element'}
            disabled={!!selectedElement.locked}
            onClick={() => editor.deleteSelection()}
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
      {chartEditorOpen && selectedElement && selectedElement.type === 'chart' && selectedIdx != null && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-40 w-[min(460px,90vw)] rounded-xl border border-border bg-surface shadow-xl shadow-black/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text">Chart data</span>
              <select
                value={selectedElement.chartType ?? 'bar'}
                onChange={(e) =>
                  updateElement(slideIndex, selectedIdx, { chartType: e.target.value as SpecElement['chartType'] })
                }
                className="h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text cursor-pointer"
              >
                {(['bar', 'line', 'pie', 'doughnut', 'radar'] as const).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              className="text-xs text-accent cursor-pointer"
              onClick={() =>
                updateElement(slideIndex, selectedIdx, {
                  datasets: [
                    ...(selectedElement.datasets ?? []),
                    { label: `Series ${(selectedElement.datasets?.length ?? 0) + 1}`, data: (selectedElement.labels ?? []).map(() => 0) },
                  ],
                })
              }
            >
              + series
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-dim">
              <span className="w-16">Value</span>
              <span className="flex-1">Category label</span>
            </div>
            {(selectedElement.labels ?? []).map((label, ri) => (
              <div key={ri} className="flex items-center gap-1.5">
                <div className="flex flex-col gap-1 w-16">
                  {(selectedElement.datasets ?? []).map((ds, di) => (
                    <input
                      key={di}
                      value={ds.data?.[ri] ?? 0}
                      type="number"
                      onChange={(e) => {
                        const datasets = (selectedElement.datasets ?? []).map((d, k) => {
                          if (k !== di) return d
                          const data = [...(d.data ?? [])]
                          while (data.length < (selectedElement.labels?.length ?? 0)) data.push(0)
                          data[ri] = Number(e.target.value)
                          return { ...d, data }
                        })
                        updateElement(slideIndex, selectedIdx, { datasets })
                      }}
                      className="w-16 h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text"
                    />
                  ))}
                </div>
                <input
                  value={label}
                  placeholder={`Label ${ri + 1}`}
                  onChange={(e) => {
                    const labels = [...(selectedElement.labels ?? [])]
                    labels[ri] = e.target.value
                    const datasets = (selectedElement.datasets ?? []).map((d) => ({
                      ...d,
                      // Keep series lengths in sync with the label count.
                      data: (d.data ?? []).length > labels.length
                        ? (d.data ?? []).slice(0, labels.length)
                        : [...(d.data ?? []), ...Array(labels.length - (d.data ?? []).length).fill(0)],
                    }))
                    updateElement(slideIndex, selectedIdx, { labels, datasets })
                  }}
                  className="flex-1 h-7 px-1.5 rounded-lg border border-border bg-bg text-xs text-text"
                />
                <button
                  className="text-xs text-red-400 px-1 cursor-pointer"
                  title="Remove category"
                  onClick={() => {
                    const labels = (selectedElement.labels ?? []).filter((_, k) => k !== ri)
                    const datasets = (selectedElement.datasets ?? []).map((d) => ({
                      ...d,
                      data: (d.data ?? []).filter((_, k) => k !== ri),
                    }))
                    updateElement(slideIndex, selectedIdx, { labels, datasets })
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-xs text-accent cursor-pointer"
            onClick={() => {
              const labels = [...(selectedElement.labels ?? []), `Item ${(selectedElement.labels?.length ?? 0) + 1}`]
              const datasets = (selectedElement.datasets ?? []).map((d) => ({ ...d, data: [...(d.data ?? []), 0] }))
              updateElement(slideIndex, selectedIdx, { labels, datasets })
            }}
          >
            + row
          </button>
        </div>
      )}
      {libraryOpen && (
        <SlideLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      )}
    </div>
  )
}
