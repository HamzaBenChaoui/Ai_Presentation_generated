import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'

// Ctrl+K command palette. Receives a flat command list from the host page
// (editor commands in the editor, dashboard actions there) and renders a
// quick-filter menu with keyboard navigation.
//
// Opens on the 'slideai:command-palette' window event. With `listenKey` it
// also binds its own Ctrl/Cmd+K (used on pages that don't already handle it).

export interface Command {
  id: string
  label: string
  hint?: string
  icon?: React.ReactNode
  run: () => void
}

interface Props {
  commands: Command[]
  listenKey?: boolean
}

export default function CommandPalette({ commands, listenKey = false }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const show = () => {
      setQuery('')
      setCursor(0)
      setOpen((o) => {
        const next = !o
        return next
      })
    }
    window.addEventListener('slideai:command-palette', show)
    return () => window.removeEventListener('slideai:command-palette', show)
  }, [])

  useEffect(() => {
    if (!open) return
    // Focus on next frame so the input exists.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!listenKey) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('slideai:command-palette'))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [listenKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q),
    )
  }, [commands, query])

  if (!open) return null

  const runAt = (i: number) => {
    const cmd = filtered[i]
    if (!cmd) return
    setOpen(false)
    cmd.run()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="w-[min(560px,92vw)] rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border">
          <Search size={15} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(filtered.length - 1, c + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(0, c - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                runAt(cursor)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-text outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted">Esc</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-text-muted">No matching command</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onMouseEnter={() => setCursor(i)}
              onClick={() => runAt(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                i === cursor ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surface2'
              }`}
            >
              {cmd.icon && <span className="shrink-0">{cmd.icon}</span>}
              <span className="flex-1 text-left">{cmd.label}</span>
              {cmd.hint && <span className="text-[10px] text-text-muted">{cmd.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
