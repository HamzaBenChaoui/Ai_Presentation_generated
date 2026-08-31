import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { SpecElement, RenderTokens } from './theme'
import { defaultTokens } from './theme'
import { useOptionalEditor } from '../editor/EditorContext'
import { SlideActiveContext } from './slideContext'
import EditableText from '../editor/EditableText'
import ImagePickerModal from '../editor/ImagePickerModal'
import { useResolvedImageSrc } from '../../lib/imageUrls'
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
  const editorCtx = useOptionalEditor()
  const activeSlideActive = useContext(SlideActiveContext)
  // Fresh signed URL when the image references a file_id (URLs expire).
  const resolvedSrc = useResolvedImageSrc(el)

  const slideIndex = useActiveSlideIndex()
  const isEditing = editorCtx?.editing === true && (el.type === 'title' || el.type === 'subtitle' || el.type === 'paragraph')
  const [imagePickerOpen, setImagePickerOpen] = useState(false)

  // The `index` prop is the position within the same element type group; the
  // real array index is needed for selection + updateElement.
  const realIndex =
    editorCtx?.spec?.slides[slideIndex]?.elements.indexOf(el) ?? index

  // Click-to-select for STRUCTURED elements (free elements select via their
  // own layer). Selection drives the editor toolbar (style, animation, ...).
  const isSel =
    editorCtx?.editing === true &&
    editorCtx.selection?.slideIndex === slideIndex &&
    editorCtx.selection?.elementIndex === realIndex
  const selectionOutline = isSel ? { outline: `2px solid ${tokens.accent}`, outlineOffset: 2 } : {}
  const selectProps = editorCtx?.editing
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation()
          editorCtx.setSelection({ slideIndex, elementIndex: realIndex })
        },
      }
    : {}

  const isSelected =
    editorCtx?.editing === true &&
    editorCtx.selection?.slideIndex === slideIndex &&
    editorCtx.selection?.elementIndex === realIndex

  const handleTextChange = (newText: string) => {
    if (editorCtx) {
      // Commit to the element's REAL index in slide.elements (not the
      // per-type group index) so edits land on the exact element rendered.
      if (el.type === 'title' || el.type === 'subtitle' || el.type === 'paragraph') {
        editorCtx.updateElement(slideIndex, realIndex, { text: newText })
      }
    }
  }

  const style: CSSProperties = {
    fontFamily: tokens.fontBody,
    color: tokens.text,
    margin: 0,
  }
  const animProps = el.animation ? { 'data-anim': el.animation } : {}
  const key = `${el.type}-${index}`

  // Per-element style overrides (ElementStyle): applied last so they win
  // over the theme defaults. fontSize/fontWeight replace the clamp() values.
  const userStyle = el.style ?? {}
  const styleOverrides: CSSProperties = {
    ...(userStyle.color ? { color: userStyle.color } : {}),
    ...(userStyle.fontSize ? { fontSize: userStyle.fontSize } : {}),
    ...(userStyle.fontWeight ? { fontWeight: userStyle.fontWeight } : {}),
    ...(userStyle.align ? { textAlign: userStyle.align } : {}),
    ...(userStyle.opacity != null ? { opacity: userStyle.opacity } : {}),
    ...(userStyle.rotation ? { transform: `rotate(${userStyle.rotation}deg)` } : {}),
  }

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
            style={{ ...titleStyle, ...styleOverrides, ...selectionOutline }}
          />
        )
      }
      return (
        <h1
          key={key}
          {...animProps}
          {...selectProps}
          style={{ ...titleStyle, ...styleOverrides, ...selectionOutline, cursor: 'pointer' }}
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
            style={{ ...style, ...subStyle, ...styleOverrides, width: '100%' }}
          />
        )
      }
      return <p key={key} {...animProps} {...selectProps} style={{ ...style, ...subStyle, ...styleOverrides, ...selectionOutline, cursor: 'pointer' }}>{el.text}</p>
    }
    case 'paragraph': {
      const paraStyle: CSSProperties = { fontSize: 'clamp(15px, 1.6vw, 20px)', lineHeight: 1.6, color: tokens.textMuted, maxWidth: '60ch' }
      if (isEditing) {
        return (
          <EditableText
            value={el.text ?? ''}
            onChange={handleTextChange}
            as="p"
            style={{ ...style, ...paraStyle, ...styleOverrides, width: '100%' }}
          />
        )
      }
      return <p key={key} {...animProps} {...selectProps} style={{ ...style, ...paraStyle, ...styleOverrides, ...selectionOutline, cursor: 'pointer' }}>{el.text}</p>
    }
    case 'bullets':
      return (
        <ul key={key} {...animProps} style={{ ...style, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          {...animProps}
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
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt={el.alt || ''}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                ...(el.flip ? { transform: 'scaleX(-1)' } : {}),
                ...(el.objectPosition ? { objectPosition: el.objectPosition } : {}),
              }}
            />
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
              {resolvedSrc ? 'Replace' : 'Insert image'}
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
        <blockquote key={key} {...animProps} {...selectProps} style={{ ...style, borderLeft: `4px solid ${tokens.accent2}`, paddingLeft: '24px', fontStyle: 'italic', fontSize: 'clamp(20px, 2.6vw, 32px)', lineHeight: 1.4, ...styleOverrides, ...selectionOutline, cursor: 'pointer' }}>
          "{el.text}"
          {el.author && <footer style={{ marginTop: '14px', fontSize: '15px', color: tokens.textMuted, fontStyle: 'normal' }}>— {el.author}</footer>}
        </blockquote>
      )
    case 'code':
      return (
        <pre key={key} {...animProps} style={{ ...style, background: '#0a0a14', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: '20px', overflow: 'auto', fontSize: '14px', fontFamily: 'ui-monospace, monospace', color: '#c8c8ff' }}>
          <code>{el.code}</code>
        </pre>
      )
    case 'table': {
      const headers = el.headers || []
      const rows = el.rows || []
      return (
        <div key={key} {...animProps} style={{ ...style, overflowX: 'auto' }}>
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
        <span key={key} {...animProps} title={el.label || el.name} style={{ fontSize: '28px' }}>{iconFor(el.name)}</span>
      )
    case 'video': {
      const vidSrc = resolvedSrc
      return (
        <video
          key={key}
          src={vidSrc ?? undefined}
          poster={el.poster ?? undefined}
          controls
          autoPlay={el.autoplay && activeSlideActive}
          muted={el.autoplay}
          style={{ width: '100%', borderRadius: tokens.radiusLg, display: 'block', border: `1px solid ${tokens.border}` }}
        />
      )
    }
    case 'audio':
      return (
        <audio key={key} src={resolvedSrc ?? undefined} controls style={{ width: '100%' }} />
      )
    case 'shape': {
      const fill = el.fill || tokens.accent
      const shapeStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        minHeight: 24,
        display: 'block',
        ...styleOverrides,
      }
      if (el.shape === 'circle') {
        return <div key={key} {...animProps} style={{ ...shapeStyle, borderRadius: '50%', background: fill }} />
      }
      if (el.shape === 'line') {
        return <div key={key} {...animProps} style={{ ...shapeStyle, height: 4, minHeight: 4, borderRadius: 2, background: fill }} />
      }
      if (el.shape === 'arrow') {
        return (
          <svg key={key} {...animProps} style={shapeStyle} viewBox="0 0 100 40" preserveAspectRatio="none">
            <line x1="0" y1="20" x2="82" y2="20" stroke={fill} strokeWidth="6" strokeLinecap="round" />
            <polygon points="80,6 100,20 80,34" fill={fill} />
          </svg>
        )
      }
      return <div key={key} {...animProps} style={{ ...shapeStyle, borderRadius: tokens.radius, background: fill }} />
    }
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
