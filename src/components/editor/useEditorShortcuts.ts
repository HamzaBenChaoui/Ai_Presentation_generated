import { useEffect } from 'react'
import { useEditor } from './EditorContext'

/**
 * Global keyboard shortcuts for the editor. Binds to the document so they
 * work regardless of focus. Only active when a selection exists.
 *
 * Ctrl+Z      Undo
 * Ctrl+Shift+Z  Redo
 * Ctrl+C      Copy selected element
 * Ctrl+V      Paste
 * Ctrl+D      Duplicate selected element
 * Delete       Delete selected element
 */
export function useEditorShortcuts() {
  const { selection, canUndo, canRedo, undo, redo, copy, paste, deleteElement, duplicateElement } = useEditor()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focused on contentEditable or input/textarea (let the browser
      // handle text-level shortcuts natively).
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
