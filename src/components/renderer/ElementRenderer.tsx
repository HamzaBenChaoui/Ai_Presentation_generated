import type { CSSProperties } from 'react'
import type { SpecElement, RenderTokens } from './theme'
import { defaultTokens } from './theme'

interface Props {
  el: SpecElement
  tokens?: RenderTokens
  index?: number
}

// Renders a single specification element. Each element is wrapped so the
// animation engine (Phase 9) can target it by its index and animation hint.
export default function ElementRenderer({ el, tokens = defaultTokens, index = 0 }: Props) {
  const style: CSSProperties = {
    fontFamily: tokens.fontBody,
    color: tokens.text,
    margin: 0,
  }
  const anim = el.animation ? `data-anim="${el.animation}"` : ''
  const key = `${el.type}-${index}`

  switch (el.type) {
    case 'title':
      return (
        <h1
          key={key}
          {...{ [anim]: '' } as any}
          style={{
            ...style,
            fontFamily: tokens.fontHeading,
            fontSize: el.level === 1 ? 'clamp(32px, 5vw, 64px)' : el.level === 2 ? 'clamp(26px, 3.6vw, 44px)' : 'clamp(20px, 2.6vw, 32px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
            color: tokens.text,
          }}
        >
          {el.text}
        </h1>
      )
    case 'subtitle':
      return (
        <p key={key} {...{ [anim]: '' } as any} style={{ ...style, fontSize: 'clamp(16px, 2vw, 24px)', color: tokens.textMuted, fontWeight: 500 }}>
          {el.text}
        </p>
      )
    case 'paragraph':
      return (
        <p key={key} {...{ [anim]: '' } as any} style={{ ...style, fontSize: 'clamp(15px, 1.6vw, 20px)', lineHeight: 1.6, color: tokens.textMuted, maxWidth: '60ch' }}>
          {el.text}
        </p>
      )
    case 'bullets':
      return (
        <ul key={key} {...{ [anim]: '' } as any} style={{ ...style, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(el.items || []).map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 'clamp(15px, 1.6vw, 20px)', color: tokens.text }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tokens.accent, marginTop: '10px', flexShrink: 0, boxShadow: `0 0 12px ${tokens.accent}` }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )
    case 'image':
      return (
        <div key={key} {...{ [anim]: '' } as any} style={{ borderRadius: tokens.radiusLg, overflow: 'hidden', border: `1px solid ${tokens.border}`, background: tokens.surface2, minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted, fontStyle: 'italic' }}>
          {el.src ? (
            <img src={el.src} alt={el.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <span>🖼 {el.alt || 'Image'}</span>
          )}
          {el.caption && <span style={{ position: 'absolute', bottom: 8, fontSize: 12 }}>{el.caption}</span>}
        </div>
      )
    case 'quote':
      return (
        <blockquote key={key} {...{ [anim]: '' } as any} style={{ ...style, borderLeft: `4px solid ${tokens.accent2}`, paddingLeft: '24px', fontStyle: 'italic', fontSize: 'clamp(20px, 2.6vw, 32px)', lineHeight: 1.4, color: tokens.text }}>
          “{el.text}”
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
                  {headers.map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '12px 14px', borderBottom: `2px solid ${tokens.border}`, color: tokens.accent }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
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
      // Complex elements are rendered by the layout components, not inline.
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
