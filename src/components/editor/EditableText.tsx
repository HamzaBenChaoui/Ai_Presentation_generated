import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  style?: React.CSSProperties
  placeholder?: string
}

/**
 * Inline editable text element. Renders as the specified HTML tag with
 * contentEditable. Commits the value to the parent on blur (if changed).
 * Click-to-focus, Escape reverts, Enter confirms.
 */
export default function EditableText({ value, onChange, as: Tag = 'p', style, placeholder = 'Click to edit' }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = useCallback(() => {
    if (draft !== value) onChange(draft)
    setEditing(false)
  }, [draft, value, onChange])

  const revert = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      revert()
    } else if (e.key === 'Enter' && (Tag === 'h1' || Tag === 'h2' || Tag === 'h3')) {
      e.preventDefault()
      ref.current?.blur()
    }
  }, [revert])

  if (!editing) {
    return (
      <Tag
        ref={ref as React.RefObject<any>}
        style={{ ...style, cursor: 'text', outline: 'none', minHeight: '1em' }}
        title="Double-click to edit"
        onDoubleClick={() => { setEditing(true); setDraft(value) }}
      >
        {value || <span style={{ color: 'inherit', opacity: 0.3 }}>{placeholder}</span>}
      </Tag>
    )
  }

  return (
    <Tag
      ref={ref as React.RefObject<any>}
      contentEditable
      suppressContentEditableWarning
      style={{ ...style, outline: 'none', cursor: 'text', minHeight: '1em' }}
      dangerouslySetInnerHTML={{ __html: draft || '' }}
      onFocus={() => { focused.current = true }}
      onBlur={() => { focused.current = false; commit() }}
      onKeyDown={handleKeyDown}
      onInput={(e) => setDraft((e.target as HTMLElement).innerText || '')}
    />
  )
}
