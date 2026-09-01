import { createContext, useState, useCallback, useRef, useContext, useEffect, type ReactNode } from 'react'
import { specApi } from '../../lib/api'
import { getSettings } from '../../lib/settings'
import type { PresentationSpec, SlideSpec, SpecElement } from '../../types'

// --- history entry -----------------------------------------------------------

interface HistoryEntry {
  spec: PresentationSpec
  note: string
}

// --- selection state -------------------------------------------------------

export interface Selection {
  slideIndex: number
  elementIndex: number | null
  /**
   * Additional selected element indexes on the SAME slide (shift-click multi
   * select). The primary elementIndex stays the "anchor" the toolbar edits.
   */
  extraIndexes?: number[] | null
}

// --- context shape -------------------------------------------------------

interface EditorContextValue {
  spec: PresentationSpec | null
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  /** True when the last save hit a 409 (deck changed elsewhere). */
  conflict: boolean
  /** Overwrite the remote version with the local spec (last-write-wins). */
  overwriteConflictSave: () => Promise<void>
  canUndo: boolean
  canRedo: boolean
  version: number
  selection: Selection | null
  copiedElement: SpecElement | null

  // Editing state (for ElementRenderer to detect)
  editing: boolean

  // Mutations
  updateElement: (slideIndex: number, elementIndex: number, patch: Partial<SpecElement>) => void
  updateSlide: (slideIndex: number, patch: Partial<SlideSpec>) => void
  addElement: (slideIndex: number, element: SpecElement) => void
  deleteElement: (slideIndex: number, elementIndex: number) => void
  duplicateElement: (slideIndex: number, elementIndex: number) => void
  deleteSlide: (slideIndex: number) => void
  duplicateSlide: (slideIndex: number) => void
  /** Append a new (blank by default) slide; returns its index. */
  addSlide: (layout?: SlideSpec['layout']) => number
  updateElementText: (slideIndex: number, elementIndex: number, text: string) => void

  // History
  undo: () => void
  redo: () => void

  // Clipboard
  copy: () => void
  paste: (targetSlideIndex?: number) => void

  // Selection
  setSelection: (sel: Selection | null) => void
  /** Shift-click: add/remove an element from the multi-selection. */
  toggleMultiSelect: (slideIndex: number, elementIndex: number) => void
  /** All selected indexes on the selection's slide (primary first). */
  selectedIndexes: number[]
  /** Delete every selected element (locked ones are skipped). */
  deleteSelection: () => void

  // AI edit
  applyAiEdit: (newSpec: PresentationSpec) => void

  // Persistence
  load: (presentationId: string) => Promise<void>
  forceSave: () => Promise<void>
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>')
  return ctx
}

// Non-throwing variant for components that render both inside and outside the
// editor (e.g. the slide renderer). Returns null when not inside the provider.
export function useOptionalEditor(): EditorContextValue | null {
  return useContext(EditorContext)
}

// --- shallow helpers -------------------------------------------------------

function patchElement(slide: SlideSpec, elIdx: number, patch: Partial<SpecElement>): SlideSpec {
  const elements = slide.elements.map((el, i) => (i === elIdx ? { ...el, ...patch } : el))
  return { ...slide, elements }
}

function patchSlide(spec: PresentationSpec, sIdx: number, patch: Partial<SlideSpec>): PresentationSpec {
  const slides = spec.slides.map((s, i) => (i === sIdx ? { ...s, ...patch } : s))
  return { ...spec, slides }
}

function specHash(spec: PresentationSpec): string {
  return JSON.stringify(spec.meta) + JSON.stringify(spec.slides.map(s => s.elements))
}

// --- provider -------------------------------------------------------------

interface Props {
  children: ReactNode
  presentationId: string
  // When provided, the editor seeds from this spec instead of fetching.
  initialSpec?: PresentationSpec | null
  // The presentation's updated_at when initialSpec was loaded — used as the
  // optimistic-locking baseline for saves.
  initialUpdatedAt?: string | null
  // Fired whenever the editor's spec changes (mutations, undo/redo, AI edits).
  // The page uses this to keep its visible spec in sync.
  onSpecChange?: (spec: PresentationSpec) => void
  // Whether inline editing is enabled. False = read-only render.
  editing?: boolean
}

export function EditorProvider({ children, presentationId, initialSpec, initialUpdatedAt, onSpecChange, editing = true }: Props) {
  const [spec, setSpec] = useState<PresentationSpec | null>(initialSpec ?? null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [selection, setSelectionState] = useState<Selection | null>(null)
  const [copiedElement, setCopiedElement] = useState<SpecElement | null>(null)
  const [version, setVersion] = useState(0)

  const savedHashRef = useRef<string>('')
  // Optimistic-locking baseline: the backend 409s when the deck changed
  // elsewhere since this timestamp; refreshed from X-Updated-At on each save.
  const updatedAtRef = useRef<string | null>(initialUpdatedAt ?? null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pidRef = useRef(presentationId)
  const onSpecChangeRef = useRef(onSpecChange)
  const seededRef = useRef(false)
  // Mirrors for the unload-flush effect (avoids stale closures).
  const specRef = useRef<PresentationSpec | null>(null)
  const dirtyRef = useRef(false)

  // Keep the latest onSpecChange without re-triggering the seed effect.
  useEffect(() => { onSpecChangeRef.current = onSpecChange }, [onSpecChange])

  // Mirror latest spec/dirty state for the unload-flush effect.
  specRef.current = spec
  dirtyRef.current = isDirty

  // NEVER LOSE EDITS: flush pending changes when the tab is hidden, when the
  // page is unloaded (keepalive fetch), and when the editor unmounts
  // (navigating away / closing overlays).
  useEffect(() => {
    const flush = () => {
      const current = specRef.current
      if (!current || !pidRef.current || !dirtyRef.current) return
      specApi.update(pidRef.current, current, updatedAtRef.current, { keepalive: true }).catch(() => {})
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      // Unmount (route change): flush whatever is still pending.
      if (dirtyRef.current && pidRef.current && specRef.current) {
        specApi.update(pidRef.current, specRef.current, updatedAtRef.current).catch(() => {})
      }
    }
  }, [])

  // --- seed from initialSpec OR fetch on mount ---

  useEffect(() => {
    if (initialSpec && !seededRef.current) {
      seededRef.current = true
      setSpec(initialSpec)
      // Restore the undo stack captured before the reload, if any.
      let restored: HistoryEntry[] = []
      try {
        const raw = sessionStorage.getItem(`slideai.undo.${presentationId}`)
        if (raw) {
          const parsed = JSON.parse(raw) as { spec: PresentationSpec; note: string }[]
          if (Array.isArray(parsed)) {
            restored = parsed.filter(e => e && e.spec).map(e => ({ spec: e.spec, note: e.note }))
          }
        }
      } catch { /* ignore */ }
      setHistory(restored)
      setFuture([])
      setIsDirty(false)
      savedHashRef.current = specHash(initialSpec)
    } else if (!initialSpec && presentationId) {
      seededRef.current = true
      load(presentationId)
    }
  }, [presentationId, initialSpec])

  // --- propagate spec changes to the parent page ---
  useEffect(() => {
    if (spec && onSpecChangeRef.current) {
      onSpecChangeRef.current(spec)
    }
  }, [spec])

  // --- push to history ---

  const bump = useCallback(() => setVersion(v => v + 1), [])

  const pushHistory = useCallback((newSpec: PresentationSpec, note: string) => {
    setHistory(h => {
      const next = [...h, { spec: newSpec, note }]
      // Keep a small undo stack across page reloads (session-only storage).
      try {
        const key = `slideai.undo.${pidRef.current}`
        const capped = next.slice(-5)
        sessionStorage.setItem(key, JSON.stringify(capped.map(e => ({ spec: e.spec, note: e.note }))))
      } catch { /* quota — undo simply won't survive reload */ }
      return next
    })
    setFuture([])
    setIsDirty(true)
    bump()
  }, [bump])

  // --- auto-save (debounced 3s) ---

  const doSave = useCallback(async () => {
    if (!spec || !pidRef.current) return
    const h = specHash(spec)
    if (h === savedHashRef.current) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await specApi.update(pidRef.current, spec, updatedAtRef.current)
      updatedAtRef.current = res.updatedAt
      savedHashRef.current = h
      setIsDirty(false)
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 409) {
        setConflict(true)
        setSaveError(
          'This presentation was modified in another tab or by an agent. ' +
          'Your changes are kept locally — reload or overwrite.',
        )
      } else {
        setSaveError(err instanceof Error ? err.message : 'Save failed')
      }
    } finally {
      setIsSaving(false)
    }
  }, [spec])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const delay = getSettings().autosaveDelay * 1000
    saveTimerRef.current = setTimeout(doSave, delay)
  }, [doSave])

  // --- mutations ---

  const updateElement = useCallback((slideIndex: number, elementIndex: number, patch: Partial<SpecElement>) => {
    if (!spec) return
    pushHistory(spec, `edit element ${elementIndex} on slide ${slideIndex}`)
    setSpec(patchSlide(spec, slideIndex, { elements: patchElement(spec.slides[slideIndex], elementIndex, patch).elements }))
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const updateSlide = useCallback((slideIndex: number, patch: Partial<SlideSpec>) => {
    if (!spec) return
    pushHistory(spec, `edit slide ${slideIndex}`)
    setSpec(patchSlide(spec, slideIndex, patch))
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const addElement = useCallback((slideIndex: number, element: SpecElement) => {
    if (!spec) return
    pushHistory(spec, `add element to slide ${slideIndex}`)
    const elements = [...(spec.slides[slideIndex]?.elements || []), element]
    setSpec(patchSlide(spec, slideIndex, { elements }))
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const deleteElement = useCallback((slideIndex: number, elementIndex: number) => {
    if (!spec) return
    // Locked elements are protected — unlock first.
    if (spec.slides[slideIndex]?.elements[elementIndex]?.locked) return
    pushHistory(spec, `delete element ${elementIndex} from slide ${slideIndex}`)
    const elements = spec.slides[slideIndex].elements.filter((_, i) => i !== elementIndex)
    setSpec(patchSlide(spec, slideIndex, { elements }))
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const duplicateElement = useCallback((slideIndex: number, elementIndex: number) => {
    if (!spec) return
    pushHistory(spec, `duplicate element ${elementIndex} on slide ${slideIndex}`)
    const el = spec.slides[slideIndex].elements[elementIndex]
    const elements = [...spec.slides[slideIndex].elements, el]
    setSpec(patchSlide(spec, slideIndex, { elements }))
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const deleteSlide = useCallback((slideIndex: number) => {
    if (!spec || spec.slides.length <= 1) return
    pushHistory(spec, `delete slide ${slideIndex}`)
    const slides = spec.slides.filter((_, i) => i !== slideIndex)
    setSpec({ ...spec, slides })
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const duplicateSlide = useCallback((slideIndex: number) => {
    if (!spec) return -1
    pushHistory(spec, `duplicate slide ${slideIndex}`)
    const slide = spec.slides[slideIndex]
    const slides = [...spec.slides]
    slides.splice(slideIndex + 1, 0, { ...slide })
    setSpec({ ...spec, slides })
    bump()
    scheduleSave()
    return slideIndex + 1
  }, [spec, pushHistory, scheduleSave, bump])

  const addSlide = useCallback((layout: SlideSpec['layout'] = 'blank'): number => {
    if (!spec) return -1
    pushHistory(spec, `add slide`)
    const newSlide: SlideSpec = { layout, elements: [] }
    const slides = [...spec.slides, newSlide]
    setSpec({ ...spec, slides })
    bump()
    scheduleSave()
    return slides.length - 1
  }, [spec, pushHistory, scheduleSave, bump])

  const updateElementText = useCallback((slideIndex: number, elementIndex: number, text: string) => {
    if (!spec) return
    const el = spec.slides[slideIndex]?.elements?.[elementIndex]
    if (!el || !('text' in el) || el.text === text) return
    pushHistory(spec, `edit text on slide ${slideIndex}`)
    const slides = spec.slides.map((s, si) => {
      if (si !== slideIndex) return s
      return {
        ...s,
        elements: s.elements.map((e, ei) => (ei === elementIndex ? { ...e, text } : e)),
      }
    })
    setSpec({ ...spec, slides })
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  // --- undo / redo ---

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setFuture(f => [...f, { spec: spec!, note: 'undo' }]) // eslint-disable-line react-hooks/exhaustive-deps
      setSpec(prev.spec)
      bump()
      setIsDirty(true)
      scheduleSave()
      return h.slice(0, -1)
    })
  }, [spec, scheduleSave, bump])

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f
      const next = f[f.length - 1]
      setHistory(h => [...h, { spec: spec!, note: 'redo' }]) // eslint-disable-line react-hooks/exhaustive-deps
      setSpec(next.spec)
      bump()
      setIsDirty(true)
      scheduleSave()
      return f.slice(0, -1)
    })
  }, [spec, scheduleSave, bump])

  // --- clipboard ---

  const copy = useCallback(() => {
    if (selection && spec) {
      const el = spec.slides[selection.slideIndex]?.elements[selection.elementIndex ?? -1]
      if (el) setCopiedElement({ ...el })
    }
  }, [selection, spec])

  const paste = useCallback((targetSlideIndex?: number) => {
    if (!copiedElement || !spec) return
    const slideIndex = targetSlideIndex ?? selection?.slideIndex
    if (slideIndex === undefined || slideIndex === null || !spec.slides[slideIndex]) return
    pushHistory(spec, 'paste element')
    const elements = [...spec.slides[slideIndex].elements, { ...copiedElement }]
    setSpec(patchSlide(spec, slideIndex, { elements }))
    setSelection({ slideIndex, elementIndex: elements.length - 1 })
    bump()
    scheduleSave()
  }, [copiedElement, selection, spec, pushHistory, scheduleSave, bump])

  const setSelection = useCallback((sel: Selection | null) => {
    // A plain (non-shift) selection reset clears the multi-select too.
    setSelectionState(sel ? { ...sel, extraIndexes: sel.extraIndexes ?? null } : null)
  }, [])

  const toggleMultiSelect = useCallback((slideIndex: number, elementIndex: number) => {
    setSelectionState((cur) => {
      if (!cur || cur.slideIndex !== slideIndex) {
        return { slideIndex, elementIndex, extraIndexes: null }
      }
      // One flat set (primary + extras); the first member becomes the anchor.
      const all = new Set<number>([
        ...(cur.extraIndexes ?? []),
        ...(cur.elementIndex != null ? [cur.elementIndex] : []),
      ])
      if (all.has(elementIndex)) all.delete(elementIndex)
      else all.add(elementIndex)
      const list = [...all]
      const primary = list.length ? list[0] : null
      return { slideIndex, elementIndex: primary, extraIndexes: list.length > 1 ? list.slice(1) : null }
    })
    bump()
  }, [bump])

  const selectedIndexes = (() => {
    if (!selection || selection.elementIndex == null) return []
    return [selection.elementIndex, ...(selection.extraIndexes ?? []).filter((i) => i !== selection.elementIndex)]
  })()

  const deleteSelection = useCallback(() => {
    if (!spec || !selection || selection.slideIndex < 0 || !spec.slides[selection.slideIndex]) return
    const slideIndex = selection.slideIndex
    const idxs = [selection.elementIndex, ...(selection.extraIndexes ?? [])].filter(
      (i): i is number => i != null,
    )
    const locked = idxs.filter((i) => spec.slides[slideIndex]?.elements[i]?.locked)
    const removable = [...new Set(idxs)].filter((i) => !locked.includes(i))
    if (!removable.length) return
    pushHistory(spec, `delete ${removable.length} element(s)`)
    const elements = spec.slides[slideIndex].elements.filter((_, i) => !removable.includes(i))
    setSpec(patchSlide(spec, slideIndex, { elements }))
    setSelectionState(null)
    bump()
    scheduleSave()
  }, [spec, selection, pushHistory, scheduleSave, bump])

  // --- load ---

  const load = useCallback(async (pid: string) => {
    pidRef.current = pid
    const data = await specApi.get(pid)
    setSpec(data)
    setHistory([])
    setFuture([])
    setIsDirty(false)
    savedHashRef.current = specHash(data)
    bump()
  }, [bump])

  // Refresh the locking baseline when the page learns a new updated_at.
  useEffect(() => {
    if (initialUpdatedAt) updatedAtRef.current = initialUpdatedAt
  }, [initialUpdatedAt])

  const forceSave = useCallback(() => doSave(), [doSave])

  const overwriteConflictSave = useCallback(async () => {
    updatedAtRef.current = null
    setConflict(false)
    await doSave()
  }, [doSave])

  const applyAiEdit = useCallback((newSpec: PresentationSpec) => {
    if (!spec) return
    // Skip if nothing actually changed (avoids stacking no-op "AI edit" entries).
    if (specHash(spec) === specHash(newSpec)) return
    pushHistory(spec, 'AI edit')
    setSpec(newSpec)
    bump()
    scheduleSave()
  }, [spec, pushHistory, scheduleSave, bump])

  const value: EditorContextValue = {
    spec, isDirty, isSaving, saveError,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    version,
    selection, copiedElement,
    editing,
    updateElement, updateSlide, addElement, deleteElement, duplicateElement,
    deleteSlide, duplicateSlide, addSlide, updateElementText,
    undo, redo, copy, paste, setSelection, applyAiEdit,
    toggleMultiSelect, selectedIndexes, deleteSelection,
    load, forceSave, conflict, overwriteConflictSave,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditorShortcuts() {
  const ctx = useContext(EditorContext)
  if (!ctx) return

  const { selection, canUndo, canRedo, undo, redo, copy, paste, deleteSelection, duplicateElement } = ctx

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      // While typing (text fields, contentEditable), let the BROWSER handle
      // copy/paste/delete — the element shortcuts must never interfere.
      const typing = e.target instanceof HTMLElement && (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA')

      const mod = e.ctrlKey || e.metaKey
      const updateElement = ctx.updateElement

      // Element shortcuts only apply OUTSIDE text editing.
      if (typing) return
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      } else if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo) redo()
      } else if (mod && e.key === 'c') {
        e.preventDefault()
        copy()
      } else if (mod && e.key === 'x') {
        e.preventDefault()
        if (selection && selection.elementIndex !== null) {
          copy()
          deleteSelection()
        }
      } else if (mod && e.key === 'v') {
        e.preventDefault()
        paste()
      } else if (mod && e.key === 'd') {
        e.preventDefault()
        if (selection && selection.elementIndex !== null) duplicateElement(selection.slideIndex, selection.elementIndex)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection && selection.elementIndex !== null) {
          e.preventDefault()
          deleteSelection()
        }
      } else if (mod && e.key === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('slideai:command-palette'))
      } else if (e.key.startsWith('Arrow') && selection && selection.elementIndex !== null) {
        // Canvas-style nudging: arrows move the selected free element by
        // 0.5%, Shift+arrows by 3%.
        const slide = ctx.spec?.slides[selection.slideIndex]
        const el = slide?.elements[selection.elementIndex]
        if (el && el.x != null && el.y != null) {
          e.preventDefault()
          const step = e.shiftKey ? 3 : 0.5
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          const nx = Math.min(96, Math.max(0, Math.round(((el.x ?? 0) + dx) * 10) / 10))
          const ny = Math.min(96, Math.max(0, Math.round(((el.y ?? 0) + dy) * 10) / 10))
          updateElement(selection.slideIndex, selection.elementIndex, { x: nx, y: ny })
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [canUndo, canRedo, undo, redo, copy, paste, selection, deleteSelection, duplicateElement])
}
