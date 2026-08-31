import { useRef, useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  style?: React.CSSProperties
  placeholder?: string
}

/**
 * Inline editable text element. Renders as the specified HTML tag.
 *
 * The editing state is UNCONTROLLED on purpose: the DOM text is only synced
 * from props when the node is NOT being edited (undo, AI edits). While
 * typing, changes stream out via onInput -> onChange without re-rendering
 * this node, so the caret never jumps (previously the caret snapped to the
 * start on every keystroke, which looked like right-to-left typing).
 */
export default function EditableText({ value, onChange, as: Tag = 'p', style, placeholder = 'Click to edit' }: Props) {
  const nodeRef = useRef<HTMLElement | null>(null)
  const setNode = (node: HTMLElement | null) => {
    nodeRef.current = node
  }
  const [editing, setEditing] = useState(false)

  // Keep the DOM text in sync when the value changes EXTERNALLY (undo, AI
  // edits) — never while the user is typing in this very node.
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    if (editing) return
    if (node.innerText !== (value || '')) node.innerText = value || ''
  }, [value, editing])

  const commit = () => {
    const node = nodeRef.current
    if (!node) return
    const next = node.innerText.replace(/\s+/g, ' ').trim()
    if (next !== (value || '').trim()) onChange(next)
    setEditing(false)
  }

  const revert = () => {
    const node = nodeRef.current
    if (node) node.innerText = value || ''
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      revert()
    } else if (e.key === 'Enter' && (Tag === 'h1' || Tag === 'h2' || Tag === 'h3')) {
      e.preventDefault()
      nodeRef.current?.blur()
    }
  }

  const focusCaretAtEnd = () => {
    const node = nodeRef.current
    if (!node) return
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  if (!editing) {
    return (
      <Tag
        ref={setNode}
        dir="ltr"
        style={{ ...style, cursor: 'text', outline: 'none', minHeight: '1em' }}
        title="Double-click to edit"
        onDoubleClick={() => setEditing(true)}
      >
        {value || <span style={{ color: 'inherit', opacity: 0.3 }}>{placeholder}</span>}
      </Tag>
    )
  }

  return (
    <Tag
      ref={setNode}
      dir="ltr"
      contentEditable
      suppressContentEditableWarning
      autoFocus
      style={{ ...style, outline: 'none', cursor: 'text', minHeight: '1em' }}
      onFocus={focusCaretAtEnd}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onInput={e => onChange((e.target as HTMLElement).innerText || '')}
    />
  )
}
