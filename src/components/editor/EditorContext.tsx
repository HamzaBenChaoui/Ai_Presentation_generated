import { createContext, useState, useCallback, useRef, useContext, useEffect, type ReactNode } from 'react'
import { specApi } from '../../lib/api'
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
}

// --- context shape -------------------------------------------------------

interface EditorContextValue {
  spec: PresentationSpec | null
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  canUndo: boolean
  canRedo: boolean
  selection: Selection | null
  copiedElement: SpecElement | null

  // Mutations
  updateElement: (slideIndex: number, elementIndex: number, patch: Partial<SpecElement>) => void
  updateSlide: (slideIndex: number, patch: Partial<SlideSpec>) => void
  addElement: (slideIndex: number, element: SpecElement) => void
  deleteElement: (slideIndex: number, elementIndex: number) => void
  duplicateElement: (slideIndex: number, elementIndex: number) => void
  deleteSlide: (slideIndex: number) => void
  duplicateSlide: (slideIndex: number) => void

  // History
  undo: () => void
  redo: () => void

  // Clipboard
  copy: () => void
  paste: () => void

  // Selection
  setSelection: (sel: Selection | null) => void

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
}

export function EditorProvider({ children, presentationId }: Props) {
  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [selection, setSelectionState] = useState<Selection | null>(null)
  const [copiedElement, setCopiedElement] = useState<SpecElement | null>(null)

  const savedHashRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pidRef = useRef(presentationId)

  // --- push to history ---

  const pushHistory = useCallback((newSpec: PresentationSpec, note: string) => {
    setHistory(h => [...h, { spec: newSpec, note }])
    setFuture([])
    setIsDirty(true)
  }, [])

  // --- auto-save (debounced 3s) ---

  const doSave = useCallback(async () => {
    if (!spec || !pidRef.current) return
    const h = specHash(spec)
    if (h === savedHashRef.current) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await specApi.update(pidRef.current, spec)
      savedHashRef.current = h
      setIsDirty(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }, [spec])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(doSave, 3000)
  }, [doSave])

  // --- mutations ---

  const updateElement = useCallback((slideIndex: number, elementIndex: number, patch: Partial<SpecElement>) => {
    if (!spec) return
    pushHistory(spec, `edit element ${elementIndex} on slide ${slideIndex}`)
    setSpec(patchSlide(spec, slideIndex, { elements: patchElement(spec.slides[slideIndex], elementIndex, patch).elements }))
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const updateSlide = useCallback((slideIndex: number, patch: Partial<SlideSpec>) => {
    if (!spec) return
    pushHistory(spec, `edit slide ${slideIndex}`)
    setSpec(patchSlide(spec, slideIndex, patch))
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const addElement = useCallback((slideIndex: number, element: SpecElement) => {
    if (!spec) return
    pushHistory(spec, `add element to slide ${slideIndex}`)
    const elements = [...(spec.slides[slideIndex]?.elements || []), element]
    setSpec(patchSlide(spec, slideIndex, { elements }))
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const deleteElement = useCallback((slideIndex: number, elementIndex: number) => {
    if (!spec) return
    pushHistory(spec, `delete element ${elementIndex} from slide ${slideIndex}`)
    const elements = spec.slides[slideIndex].elements.filter((_, i) => i !== elementIndex)
    setSpec(patchSlide(spec, slideIndex, { elements }))
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const duplicateElement = useCallback((slideIndex: number, elementIndex: number) => {
    if (!spec) return
    pushHistory(spec, `duplicate element ${elementIndex} on slide ${slideIndex}`)
    const el = spec.slides[slideIndex].elements[elementIndex]
    const elements = [...spec.slides[slideIndex].elements, el]
    setSpec(patchSlide(spec, slideIndex, { elements }))
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const deleteSlide = useCallback((slideIndex: number) => {
    if (!spec || spec.slides.length <= 1) return
    pushHistory(spec, `delete slide ${slideIndex}`)
    const slides = spec.slides.filter((_, i) => i !== slideIndex)
    setSpec({ ...spec, slides })
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const duplicateSlide = useCallback((slideIndex: number) => {
    if (!spec) return
    pushHistory(spec, `duplicate slide ${slideIndex}`)
    const slide = spec.slides[slideIndex]
    const slides = [...spec.slides]
    slides.splice(slideIndex + 1, 0, { ...slide })
    setSpec({ ...spec, slides })
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  // --- undo / redo ---

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setFuture(f => [...f, { spec: spec!, note: 'undo' }]) // eslint-disable-line react-hooks/exhaustive-deps
      setSpec(prev.spec)
      setIsDirty(true)
      scheduleSave()
      return h.slice(0, -1)
    })
  }, [spec, scheduleSave])

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f
      const next = f[f.length - 1]
      setHistory(h => [...h, { spec: spec!, note: 'redo' }]) // eslint-disable-line react-hooks/exhaustive-deps
      setSpec(next.spec)
      setIsDirty(true)
      scheduleSave()
      return f.slice(0, -1)
    })
  }, [spec, scheduleSave])

  // --- clipboard ---

  const copy = useCallback(() => {
    if (selection && spec) {
      const el = spec.slides[selection.slideIndex]?.elements[selection.elementIndex ?? -1]
      if (el) setCopiedElement({ ...el })
    }
  }, [selection, spec])

  const paste = useCallback(() => {
    if (!copiedElement || !selection || !spec) return
    pushHistory(spec, 'paste element')
    const elements = [...spec.slides[selection.slideIndex].elements, { ...copiedElement }]
    setSpec(patchSlide(spec, selection.slideIndex, { elements }))
    scheduleSave()
  }, [copiedElement, selection, spec, pushHistory, scheduleSave])

  const setSelection = useCallback((sel: Selection | null) => setSelectionState(sel), [])

  // --- load ---

  const load = useCallback(async (pid: string) => {
    pidRef.current = pid
    const data = await specApi.get(pid)
    setSpec(data)
    setHistory([])
    setFuture([])
    setIsDirty(false)
    savedHashRef.current = specHash(data)
  }, [])

  const forceSave = useCallback(() => doSave(), [doSave])

  const applyAiEdit = useCallback((newSpec: PresentationSpec) => {
    if (!spec) return
    pushHistory(spec, 'AI edit')
    setSpec(newSpec)
    scheduleSave()
  }, [spec, pushHistory, scheduleSave])

  const value: EditorContextValue = {
    spec, isDirty, isSaving, saveError,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    selection, copiedElement,
    updateElement, updateSlide, addElement, deleteElement, duplicateElement,
    deleteSlide, duplicateSlide,
    undo, redo, copy, paste, setSelection, applyAiEdit,
    load, forceSave,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditorShortcuts() {
  const ctx = useContext(EditorContext)
  if (!ctx) return

  const { selection, canUndo, canRedo, undo, redo, copy, paste, deleteElement, duplicateElement } = ctx

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.target instanceof HTMLElement && (tag === 'INPUT' || tag === 'TEXTAREA')) return
      if ((e.target as HTMLElement).isContentEditable) return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      } else if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo) redo()
      } else if (mod && e.key === 'c') {
        e.preventDefault()
        copy()
      } else if (mod && e.key === 'v') {
        e.preventDefault()
        paste()
      } else if (mod && e.key === 'd') {
        e.preventDefault()
        if (selection && selection.elementIndex !== null) duplicateElement(selection.slideIndex, selection.elementIndex)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection && selection.elementIndex !== null) {
          e.preventDefault()
          deleteElement(selection.slideIndex, selection.elementIndex)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [canUndo, canRedo, undo, redo, copy, paste, selection, deleteElement, duplicateElement])
}
