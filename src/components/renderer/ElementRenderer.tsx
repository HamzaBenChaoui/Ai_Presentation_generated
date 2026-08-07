import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { SpecElement, RenderTokens } from './theme'
import { defaultTokens } from './theme'
import { useEditor } from '../editor/EditorContext'
import EditableText from '../editor/EditableText'
import ImagePickerModal from '../editor/ImagePickerModal'
import { Image as ImageIcon } from 'lucide-react'

/** Simple context to pass the current slide index down to ElementRenderer. */
const ActiveSlideIndex = createContext(0)

export function ActiveSlideIndexProvider({ slideIndex, children }: { slideIndex: number; children: React.ReactNode }) {
  return <ActiveSlideIndex.Provider value={slideIndex}>{children}</ActiveSlideIndex.Provider>
}

export function useActiveSlideIndex() { return useContext(ActiveSlideIndex) }

interface Props {
  el: SpecElement
  tokens?: RenderTokens
  index?: number
}

export default function ElementRenderer({ el, tokens = defaultTokens, index = 0 }: Props) {
  let editorCtx: ReturnType<typeof useEditor> | null = null
  try { editorCtx = useEditor() } catch { /* not in editor */ }
  const slideIndex = useActiveSlideIndex()
  const isEditing = editorCtx?.editing === true && (el.type === 'title' || el.type === 'subtitle' || el.type === 'paragraph')
  const [imagePickerOpen, setImagePickerOpen] = useState(false)

  // The `index` prop is the position within the same element type group; the
  // real array index is needed for selection + updateElement.
  const realIndex =
    editorCtx?.spec?.slides[slideIndex]?.elements.indexOf(el) ?? index

  const isSelected =
    editorCtx?.editing === true &&
    editorCtx.selection?.slideIndex === slideIndex &&
    editorCtx.selection?.elementIndex === realIndex

  const handleTextChange = (newText: string) => {
    if (editorCtx) {
      // Find the active slide index from the spec — for fullscreen single-slide mode,
      // the active slide is the one being displayed
      // We need the current slide index; EditorContext doesn't track it directly,
      // but the PresentationRenderer in fullscreen mode renders slide at activeIndex.
      // We use 0 as default since fullscreen only shows one slide.
      // The real fix: use the active slide index from the parent.
      // For now, use the spec's current slides index.
      // This works because in fullscreen mode we only render the active slide,
      // and the ElementRenderer gets the elements from that slide.
      // We need to find which slide this element belongs to.
      // Simple approach: just use updateElement which already exists.
      if (el.type === 'title' || el.type === 'subtitle' || el.type === 'paragraph') {
        editorCtx.updateElement(slideIndex, index, { text: newText })
      }
    }
  }

  const style: CSSProperties = {
    fontFamily: tokens.fontBody,
    color: tokens.text,
    margin: 0,
  }
  const anim = el.animation ? `data-anim="${el.animation}"` : ''
  const key = `${el.type}-${index}`

  switch (el.type) {
    case 'title': {
      const titleStyle: CSSProperties = {
        fontFamily: tokens.fontHeading,
        fontSize: el.level === 1 ? 'clamp(32px, 5vw, 64px)' : el.level === 2 ? 'clamp(26px, 3.6vw, 44px)' : 'clamp(20px, 2.6vw, 32px)',
        fontWeight: 800,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        margin: 0,
        color: tokens.text,
        display: 'block',
      }
      const tag = el.level === 1 ? 'h1' : el.level === 2 ? 'h2' : 'h3'

      if (isEditing) {
        return (
          <EditableText
            value={el.text ?? ''}
            onChange={handleTextChange}
            as={tag}
            style={titleStyle}
          />
        )
      }
      return (
        <h1
          key={key}
          {...{ [anim]: '' } as any}
          style={titleStyle}
        >
          {el.text}
        </h1>
      )
    }
    case 'subtitle': {
      const subStyle: CSSProperties = { fontSize: 'clamp(16px, 2vw, 24px)', color: tokens.textMuted, fontWeight: 500 }
      if (isEditing) {
        return (
          <EditableText
            value={el.text ?? ''}
            onChange={handleTextChange}
            as="p"
            style={{ ...style, ...subStyle, width: '100%' }}
          />
        )
      }
      return <p key={key} {...{ [anim]: '' } as any} style={{ ...style, ...subStyle }}>{el.text}</p>
    }
    case 'paragraph': {
      const paraStyle: CSSProperties = { fontSize: 'clamp(15px, 1.6vw, 20px)', lineHeight: 1.6, color: tokens.textMuted, maxWidth: '60ch' }
      if (isEditing) {
        return (
          <EditableText
            value={el.text ?? ''}
            onChange={handleTextChange}
            as="p"
            style={{ ...style, ...paraStyle, width: '100%' }}
          />
        )
      }
      return <p key={key} {...{ [anim]: '' } as any} style={{ ...style, ...paraStyle }}>{el.text}</p>
    }
    case 'bullets':
      return (
        <ul key={key} {...{ [anim]: '' } as any} style={{ ...style, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(el.items || []).map((b: any, i: number) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 'clamp(15px, 1.6vw, 20px)', color: tokens.text }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tokens.accent, marginTop: '10px', flexShrink: 0, boxShadow: `0 0 12px ${tokens.accent}` }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )
    case 'image': {
      const showInsert = editorCtx?.editing === true && (!el.src || isSelected)
      return (
        <div
          key={key}
          {...{ [anim]: '' } as any}
          onClick={() => {
            if (editorCtx?.editing) editorCtx.setSelection({ slideIndex, elementIndex: realIndex })
          }}
          style={{
            position: 'relative',
            borderRadius: tokens.radiusLg,
            overflow: 'hidden',
            border: isSelected ? `2px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
            background: tokens.surface2,
            minHeight: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.textMuted,
            fontStyle: 'italic',
            cursor: editorCtx?.editing ? 'pointer' : 'default',
          }}
        >
          {el.src ? (
            <img src={el.src} alt={el.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <span>{el.alt || 'Image'}</span>
          )}
          {showInsert && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setImagePickerOpen(true)
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ImageIcon size={14} />
              {el.src ? 'Replace' : 'Insert image'}
            </button>
          )}
          {el.caption && <span style={{ position: 'absolute', bottom: 8, fontSize: 12 }}>{el.caption}</span>}
          {imagePickerOpen &&
            createPortal(
              <ImagePickerModal
                open={imagePickerOpen}
                onClose={() => setImagePickerOpen(false)}
                onInsert={(src, alt) => {
                  editorCtx?.updateElement(slideIndex, realIndex, { src, alt })
                  setImagePickerOpen(false)
                }}
              />,
              document.body,
            )}
        </div>
      )
    }
    case 'quote':
      return (
        <blockquote key={key} {...{ [anim]: '' } as any} style={{ ...style, borderLeft: `4px solid ${tokens.accent2}`, paddingLeft: '24px', fontStyle: 'italic', fontSize: 'clamp(20px, 2.6vw, 32px)', lineHeight: 1.4, color: tokens.text }}>
          "{el.text}"
          {el.author && <footer style={{ marginTop: '14px', fontSize: '15px', color: tokens.textMuted, fontStyle: 'normal' }}>— {el.author}</footer>}
        </blockquote>
      )
    case 'code':
      return (
        <pre key={key} {...{ [anim]: '' } as any} style={{ ...style, background: '#0a0a14', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: '20px', overflow: 'auto', fontSize: '14px', fontFamily: 'ui-monospace, monospace', color: '#c8c8ff' }}>
          <code>{el.code}</code>
        </pre>
      )
    case 'table': {
      const headers = el.headers || []
      const rows = el.rows || []
      return (
        <div key={key} {...{ [anim]: '' } as any} style={{ ...style, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((h: string, i: number) => (
                    <th key={i} style={{ textAlign: 'left', padding: '12px 14px', borderBottom: `2px solid ${tokens.border}`, color: tokens.accent }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r: any[], ri: number) => (
                <tr key={ri}>
                  {r.map((c: any, ci: number) => (
                    <td key={ci} style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.border}`, color: tokens.text }}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'icon':
      return (
        <span key={key} {...{ [anim]: '' } as any} title={el.label || el.name} style={{ fontSize: '28px' }}>{iconFor(el.name)}</span>
      )
    case 'statistics':
    case 'cards':
    case 'timeline':
    case 'comparison':
    case 'diagram':
      return null
    default:
      return null
  }
}

function iconFor(name?: string): string {
  const map: Record<string, string> = {
    spark: '✨', rocket: '🚀', target: '🎯', chart: '📊', bulb: '💡',
    star: '⭐', heart: '❤️', bolt: '⚡', flag: '🚩', check: '✅',
  }
  return map[name || 'spark'] || '✨'
}