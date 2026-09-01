import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowUpToLine, Copy, Lock, LockOpen, Trash2,
} from 'lucide-react'
import { useEditor } from './EditorContext'

// Canva-style right-click menu for the canvas. Right-clicking a free element
// selects it and offers element actions; right-clicking empty canvas offers
// paste / select-deselect. Rendered in a fixed overlay, clamped to the viewport.

interface MenuState {
  x: number
  y: number
  elementIndex: number | null
}

export default function EditorContextMenu({ slideIndex }: { slideIndex: number }) {
  const editor = useEditor()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const freeEl = target.closest('[data-free-el]')
      const inStage = target.closest('main')
      if (!freeEl && !inStage) return
      if (!editor.editing) return
      e.preventDefault()
      let elementIndex: number | null = null
      if (freeEl) {
        const idx = Number(freeEl.getAttribute('data-free-el'))
        if (!Number.isNaN(idx)) {
          elementIndex = idx
          const already = editor.selectedIndexes.includes(idx)
          if (!already) editor.setSelection({ slideIndex, elementIndex: idx })
        }
      } else {
        editor.setSelection(null)
      }
      setMenu({ x: e.clientX, y: e.clientY, elementIndex })
    }
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('contextmenu', onContext)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('contextmenu', onContext)
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [editor, slideIndex])

  if (!menu) return null

  const el = menu.elementIndex != null ? editor.spec?.slides[slideIndex]?.elements[menu.elementIndex] : null
  const item = (label: string, icon: React.ReactNode, run: () => void, danger = false, disabled = false) => (
    <button
      key={label}
      disabled={disabled}
      onClick={() => {
        run()
        setMenu(null)
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text hover:bg-surface2'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  const locked = !!el?.locked
  const menuW = 200
  const menuH = 260
  const x = Math.min(menu.x, window.innerWidth - menuW - 8)
  const y = Math.min(menu.y, window.innerHeight - menuH - 8)

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-[70] min-w-[200px] rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/30"
    >
      {el ? (
        <>
          {item('Copy', <Copy size={13} />, () => editor.copy())}
          {item('Duplicate', <Copy size={13} />, () => {
            if (menu.elementIndex != null) editor.duplicateElement(slideIndex, menu.elementIndex)
          })}
          {item('Bring to front', <ArrowUpToLine size={13} />, () => {
            if (menu.elementIndex == null) return
            const slide = editor.spec?.slides[slideIndex]
            if (!slide) return
            const target = slide.elements[menu.elementIndex]
            const elements = slide.elements.filter((_, i) => i !== menu.elementIndex)
            elements.push(target)
            editor.updateSlide(slideIndex, { elements })
            editor.setSelection({ slideIndex, elementIndex: elements.length - 1 })
          })}
          {item('Send to back', <ArrowDownToLine size={13} />, () => {
            if (menu.elementIndex == null) return
            const slide = editor.spec?.slides[slideIndex]
            if (!slide) return
            const target = slide.elements[menu.elementIndex]
            const elements = slide.elements.filter((_, i) => i !== menu.elementIndex)
            elements.unshift(target)
            editor.updateSlide(slideIndex, { elements })
            editor.setSelection({ slideIndex, elementIndex: 0 })
          })}
          {item(
            locked ? 'Unlock' : 'Lock',
            locked ? <LockOpen size={13} /> : <Lock size={13} />,
            () => {
              if (menu.elementIndex != null) {
                editor.updateElement(slideIndex, menu.elementIndex, { locked: !locked })
              }
            },
          )}
          {item('Delete', <Trash2 size={13} />, () => editor.deleteSelection(), true, locked)}
        </>
      ) : (
        <>
          {item('Paste here', <Copy size={13} />, () => editor.paste(slideIndex), false, !editor.copiedElement)}
        </>
      )}
    </div>
  )
}
