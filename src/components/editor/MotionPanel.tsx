import { useRef, useState } from 'react'
import { Play, ArrowUp, ArrowDown, Sparkles, Film, Mic, MicOff, StickyNote } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useEditor } from './EditorContext'
import type { SpecElement } from '../../types'

// Minimal Web Speech API surface (Chrome/Edge).
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null
}

const BUILT_IN_ANIMATIONS = [
  'fade', 'slide', 'scale', 'zoom', 'rotate', 'blur',
  'reveal', 'typing', 'counter', 'gradient', 'parallax', 'sequential',
] as const

interface Props {
  slideIndex: number
  onReplay: () => void
}

/**
 * Animation timeline for the current slide: per-element entrance animation,
 * manual delay, and ordering — plus a Replay button that re-runs the whole
 * entrance sequence so changes are immediately visible.
 */
export default function MotionPanel({ slideIndex, onReplay }: Props) {
  const { spec, updateElement, updateSlide } = useEditor()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  if (!spec) return null
  const slide = spec.slides[slideIndex]
  if (!slide) return null

  const notes = slide.notes ?? ''

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      return
    }
    const rec = new Recognition()
    rec.lang = spec.meta.language === 'French' ? 'fr-FR' : 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? ''
      }
      const base = slide.notes ? slide.notes.trim() + ' ' : ''
      updateSlide(slideIndex, { notes: (base + transcript).trim() })
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  const customAnims = (spec.meta.customAnimations ?? []).map((d) => d.name).filter(Boolean)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= slide.elements.length) return
    const els = [...slide.elements]
    const [el] = els.splice(from, 1)
    els.splice(to, 0, el)
    updateSlide(slideIndex, { elements: els })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
          <Film size={13} className="text-accent" />
          Motion · slide {slideIndex + 1}
        </div>
        <button
          onClick={onReplay}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/40 bg-accent/10 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          title="Replay this slide's entrance animations"
        >
          <Play size={11} />
          Replay
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {slide.elements.length === 0 && (
          <p className="text-xs text-text-dim text-center py-8">
            No elements on this slide yet.
          </p>
        )}
        {slide.elements.map((el: SpecElement, i: number) => {
          const label = (el.text || el.alt || el.type).slice(0, 28)
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface2/50 overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left cursor-pointer hover:bg-surface2 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="w-5 h-5 shrink-0 rounded-md bg-bg/70 text-[10px] font-bold text-text-dim grid place-items-center">
                  {i}
                </span>
                <span className="text-[11px] font-semibold uppercase text-accent/80 shrink-0">
                  {el.type}
                </span>
                <span className="text-xs text-text-dim truncate flex-1">{label}</span>
                {el.animation && (
                  <span title={el.animation} className="shrink-0 text-accent">
                    <Sparkles size={11} />
                  </span>
                )}
                <span className="flex shrink-0">
                  <span
                    role="button"
                    className="p-1 text-text-dim hover:text-text cursor-pointer"
                    title="Move up (earlier)"
                    onClick={(e) => {
                      e.stopPropagation()
                      move(i, i - 1)
                    }}
                  >
                    <ArrowUp size={12} />
                  </span>
                  <span
                    role="button"
                    className="p-1 text-text-dim hover:text-text cursor-pointer"
                    title="Move down (later)"
                    onClick={(e) => {
                      e.stopPropagation()
                      move(i, i + 1)
                    }}
                  >
                    <ArrowDown size={12} />
                  </span>
                </span>
              </button>

              {openIndex === i && (
                <div className="px-2.5 pb-2.5 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <select
                    value={el.animation ?? ''}
                    onChange={(e) => updateElement(slideIndex, i, { animation: e.target.value || null })}
                    className="flex-1 min-w-[110px] h-7 rounded-lg border border-border bg-bg px-1.5 text-[11px] text-text cursor-pointer"
                  >
                    <option value="">No animation</option>
                    <optgroup label="Built-in">
                      {BUILT_IN_ANIMATIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </optgroup>
                    {customAnims.length > 0 && (
                      <optgroup label="Custom">
                        {customAnims.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <label className="flex items-center gap-1 text-[10px] text-text-dim">
                    delay
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={100}
                      value={el.animationDelay ?? 0}
                      onChange={(e) =>
                        updateElement(slideIndex, i, { animationDelay: Number(e.target.value) || 0 })
                      }
                      className="w-16 h-7 px-1.5 rounded-lg border border-border bg-bg text-[11px] text-text"
                    />
                    ms
                  </label>
                  <button
                    className={cn(
                      'text-[10px] text-text-dim hover:text-red-400 cursor-pointer px-1',
                    )}
                    onClick={() => updateElement(slideIndex, i, { animation: null, animationDelay: 0 })}
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Speaker notes + voice dictation */}
        <div className="mt-2 rounded-xl border border-border bg-surface2/50 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-text">
              <StickyNote size={12} className="text-accent" />
              Speaker notes
            </span>
            <button
              onClick={toggleDictation}
              disabled={!getSpeechRecognition()}
              title={getSpeechRecognition() ? (listening ? 'Stop dictation' : 'Dictate notes with your voice') : 'Voice dictation not supported in this browser'}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer',
                listening
                  ? 'border-red-500/50 bg-red-500/15 text-red-400 animate-pulse'
                  : 'border-border text-text-dim hover:text-accent hover:border-accent/40',
                'disabled:opacity-40 disabled:cursor-default',
              )}
            >
              {listening ? <MicOff size={11} /> : <Mic size={11} />}
              {listening ? 'Stop' : 'Dictate'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => updateSlide(slideIndex, { notes: e.target.value })}
            placeholder="Speaker notes for this slide — type or dictate…"
            className="w-full min-h-[70px] rounded-lg border border-border bg-bg p-2 text-xs text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          />
        </div>
      </div>
    </div>
  )
}
