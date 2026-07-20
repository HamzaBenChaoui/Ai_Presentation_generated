import type { CSSProperties } from 'react'
import type { SlideSpec, SpecElement, RenderTokens } from './theme'
import { defaultTokens } from './theme'
import ElementRenderer from './ElementRenderer'

export interface LayoutProps {
  slide: SlideSpec
  tokens?: RenderTokens
  index?: number
}

// --- helpers ---------------------------------------------------------------

function splitElements(slide: SlideSpec) {
  const byType: Record<string, SpecElement[]> = {}
  for (const el of slide.elements) {
    ;(byType[el.type] ||= []).push(el)
  }
  return byType
}

function stack(children: JSX.Element[], gap = '20px'): CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap, width: '100%' }
}

function card(tokens: RenderTokens): CSSProperties {
  return {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: tokens.radiusLg,
    padding: '26px',
  }
}

// --- 30+ layouts -----------------------------------------------------------

export function Hero({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([...((e.title || []) as any), ...((e.subtitle || []) as any)]), alignItems: 'center', textAlign: 'center', justifyContent: 'center', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
      {(e.paragraph || []).map((el, i) => <ElementRenderer key={`p${i}`} el={el} tokens={tokens} index={i + 2} />)}
    </div>
  )
}

export function Title({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([...((e.title || []) as any), ...((e.subtitle || []) as any)]), justifyContent: 'center', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
    </div>
  )
}

export function Agenda({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const bullets = e.bullets?.[0]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {bullets && <ElementRenderer el={bullets} tokens={tokens} index={1} />}
      {(e.paragraph || []).map((el, i) => <ElementRenderer key={`p${i}`} el={el} tokens={tokens} index={i + 2} />)}
    </div>
  )
}

export function Section({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), justifyContent: 'center', alignItems: 'flex-start', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
      {(e.paragraph || []).map((el, i) => <ElementRenderer key={`p${i}`} el={el} tokens={tokens} index={i + 2} />)}
    </div>
  )
}

export function BulletsLayout({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {e.bullets?.map((el, i) => <ElementRenderer key={`b${i}`} el={el} tokens={tokens} index={i + 1} />)}
    </div>
  )
}

export function Timeline({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.timeline?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: tokens.accent, boxShadow: `0 0 14px ${tokens.accent}`, marginTop: '4px' }} />
              {i < items.length - 1 && <div style={{ width: '2px', flex: 1, background: tokens.border, minHeight: '40px' }} />}
            </div>
            <div style={{ paddingBottom: '24px' }}>
              <div style={{ fontFamily: tokens.fontHeading, fontWeight: 700, color: tokens.accent3, fontSize: '16px' }}>{it.year || it.time || ''}</div>
              <div style={{ color: tokens.text, fontSize: '17px' }}>{it.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Comparison({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const cmp = e.comparison?.[0] as any
  const left = cmp?.left || {}
  const right = cmp?.right || {}
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '8px' }}>
        {[left, right].map((col, ci) => (
          <div key={ci} style={{ ...card(tokens), borderColor: ci === 1 ? tokens.accent2 : tokens.border }}>
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 700, marginBottom: '12px', color: ci === 1 ? tokens.accent2 : tokens.accent }}>{col.title}</div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: tokens.text, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(col.points || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Cards({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
        {items.map((it, i) => (
          <div key={i} style={card(tokens)}>
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: tokens.text }}>{it.title}</div>
            <div style={{ color: tokens.textMuted, fontSize: '15px', lineHeight: 1.5 }}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Statistics({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.statistics?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '8px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), textAlign: 'center' }}>
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{it.value}</div>
            <div style={{ color: tokens.textMuted, marginTop: '6px', fontSize: '15px' }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Pricing({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), borderColor: it.highlight ? tokens.accent : tokens.border, position: 'relative' }}>
            {it.highlight && <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px' }}>Popular</span>}
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: '22px' }}>{it.title}</div>
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: '32px', margin: '10px 0', color: tokens.accent3 }}>{it.price}</div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: tokens.textMuted, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(it.features || []).map((f: string, fi: number) => <li key={fi}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Gallery({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || e.image ? [] : []) as any[]
  const imgs = slide.elements.filter((x) => x.type === 'image')
  const cells = items.length ? items : imgs
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {cells.map((it, i) => (
          <div key={i} style={{ ...card(tokens), minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted }}>
            {it.src ? <img src={it.src} alt={it.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: tokens.radius }} /> : (it.body || it.alt || '🖼')}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Process({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.timeline?.[0]?.items || e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '8px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), flex: '1 1 160px', minWidth: '160px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '10px' }}>{i + 1}</div>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: tokens.text }}>{it.title || it.text}</div>
            <div style={{ color: tokens.textMuted, fontSize: '14px' }}>{it.body || it.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Flow({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.timeline?.[0]?.items || e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        {items.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...card(tokens), padding: '12px 18px', fontWeight: 600, color: tokens.text }}>{it.title || it.text}</span>
            {i < items.length - 1 && <span style={{ color: tokens.accent, fontSize: '20px' }}>→</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Roadmap({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.timeline?.[0]?.items || e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ position: 'relative', paddingLeft: '20px', marginTop: '8px' }}>
        <div style={{ position: 'absolute', left: '6px', top: 0, bottom: 0, width: '2px', background: `linear-gradient(${tokens.accent}, ${tokens.accent2})` }} />
        {items.map((it, i) => (
          <div key={i} style={{ marginBottom: '22px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: tokens.accent3 }} />
            <div style={{ fontFamily: tokens.fontHeading, fontWeight: 700, color: tokens.accent3 }}>{it.year || it.time || `Q${i + 1}`}</div>
            <div style={{ color: tokens.text }}>{it.title || it.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Team({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '8px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{it.avatar || '👤'}</div>
            <div style={{ fontWeight: 700, color: tokens.text }}>{it.title || it.name}</div>
            <div style={{ color: tokens.textMuted, fontSize: '14px' }}>{it.role}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Quote({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%' }}>
      {(e.quote || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
    </div>
  )
}

export function SWOT({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  const labels = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats']
  const colors = [tokens.accent3, '#ff6b81', tokens.accent, tokens.accent2]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), borderTop: `3px solid ${colors[i % 4]}` }}>
            <div style={{ fontWeight: 800, marginBottom: '8px', color: colors[i % 4] }}>{labels[i % 4]}</div>
            <div style={{ color: tokens.textMuted, fontSize: '14px' }}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Table({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {e.table?.map((el, i) => <ElementRenderer key={`t${i}`} el={el} tokens={tokens} index={i + 1} />)}
    </div>
  )
}

export function Chart({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const stats = e.statistics?.[0] as any
  const items = stats?.items || []
  const max = Math.max(...items.map((x: any) => parseFloat(String(x.value).replace(/[^0-9.]/g, '')) || 1), 1)
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '200px', padding: '20px', ...card(tokens) }}>
        {items.map((it: any, i: number) => {
          const v = parseFloat(String(it.value).replace(/[^0-9.]/g, '')) || 0
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: `${(v / max) * 100}%`, background: `linear-gradient(180deg, ${tokens.accent}, ${tokens.accent2})`, borderRadius: '8px 8px 0 0', transition: 'height 0.6s ease' }} />
              <div style={{ fontSize: '12px', color: tokens.textMuted, textAlign: 'center' }}>{it.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ImageLeft({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const img = e.image?.[0]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'center', height: '100%' }}>
      <div style={{ ...card(tokens), minHeight: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted, overflow: 'hidden' }}>
        {img?.src ? <img src={img.src} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (img?.alt || '🖼')}
      </div>
      <div style={stack([])}>
        {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
        {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
        {e.bullets?.map((el, i) => <ElementRenderer key={`b${i}`} el={el} tokens={tokens} index={i + 2} />)}
      </div>
    </div>
  )
}

export function ImageRight({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const img = e.image?.[0]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'center', height: '100%' }}>
      <div style={stack([])}>
        {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
        {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
        {e.bullets?.map((el, i) => <ElementRenderer key={`b${i}`} el={el} tokens={tokens} index={i + 2} />)}
      </div>
      <div style={{ ...card(tokens), minHeight: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted, overflow: 'hidden' }}>
        {img?.src ? <img src={img.src} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (img?.alt || '🖼')}
      </div>
    </div>
  )
}

export function CTA({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), alignItems: 'center', textAlign: 'center', justifyContent: 'center', height: '100%', gap: '24px' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
      <button style={{ padding: '14px 34px', borderRadius: '40px', border: 'none', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: `0 10px 30px ${tokens.accent}66` }}>
        {(e.paragraph?.[0]?.text) || 'Get started'}
      </button>
    </div>
  )
}

export function Conclusion({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), justifyContent: 'center', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.bullets || []).map((el, i) => <ElementRenderer key={`b${i}`} el={el} tokens={tokens} index={i + 1} />)}
      {(e.paragraph || []).map((el, i) => <ElementRenderer key={`p${i}`} el={el} tokens={tokens} index={i + 2} />)}
    </div>
  )
}

export function ThankYou({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), alignItems: 'center', textAlign: 'center', justifyContent: 'center', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
    </div>
  )
}

// --- additional layouts to exceed 30 ---------------------------------------

export function Diagram({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const diag = e.diagram?.[0] as any
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ ...card(tokens), textAlign: 'center', minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div style={{ fontSize: '48px' }}>🧩</div>
        <div style={{ color: tokens.textMuted }}>{diag?.label || 'Diagram placeholder'}</div>
        <div style={{ fontSize: '13px', color: tokens.textDim ?? tokens.textMuted }}>{diag?.kind}</div>
      </div>
    </div>
  )
}

export function CodeLayout({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {e.code?.map((el, i) => <ElementRenderer key={`c${i}`} el={el} tokens={tokens} index={i + 1} />)}
    </div>
  )
}

export function IconGrid({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || e.icon?.map((x) => ({ title: x.label, body: x.name })) || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), textAlign: 'center' }}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>✨</div>
            <div style={{ fontWeight: 700, color: tokens.text }}>{it.title}</div>
            <div style={{ color: tokens.textMuted, fontSize: '13px' }}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Features({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens), borderLeft: `4px solid ${tokens.accent}` }}>
            <div style={{ fontWeight: 800, marginBottom: '8px', color: tokens.text }}>{it.title}</div>
            <div style={{ color: tokens.textMuted, fontSize: '14px' }}>{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NumberedList({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || e.bullets?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {items.map((it: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tokens.surface2, border: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: tokens.accent, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ color: tokens.text, fontSize: '17px' }}>{typeof it === 'string' ? it : it.title || it.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BigStat({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const stat = e.statistics?.[0]?.items?.[0] as any
  return (
    <div style={{ ...stack([]), alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {stat && (
        <div>
          <div style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: 'clamp(60px, 12vw, 140px)', background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{stat.value}</div>
          <div style={{ color: tokens.textMuted, fontSize: '20px', marginTop: '10px' }}>{stat.label}</div>
        </div>
      )}
    </div>
  )
}

export function TwoColumn({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || e.bullets?.[0]?.items || []) as any[]
  const half = Math.ceil(items.length / 2)
  const col = (arr: any[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {arr.map((it, i) => (
        <div key={i} style={card(tokens)}>
          <div style={{ color: tokens.text }}>{typeof it === 'string' ? it : it.title || it.text}</div>
          {typeof it !== 'string' && it.body && <div style={{ color: tokens.textMuted, fontSize: '14px', marginTop: '6px' }}>{it.body}</div>}
        </div>
      ))}
    </div>
  )
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {col(items.slice(0, half))}
        {col(items.slice(half))}
      </div>
    </div>
  )
}

export function Testimonials({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  const items = (e.cards?.[0]?.items || []) as any[]
  return (
    <div style={stack([])}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(tokens) }}>
            <div style={{ fontSize: '22px', color: tokens.accent3, marginBottom: '8px' }}>“</div>
            <div style={{ color: tokens.text, fontStyle: 'italic', lineHeight: 1.5 }}>{it.body}</div>
            <div style={{ marginTop: '12px', fontWeight: 700, color: tokens.text }}>{it.title}</div>
            {it.role && <div style={{ color: tokens.textMuted, fontSize: '13px' }}>{it.role}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Cover({ slide, tokens = defaultTokens }: LayoutProps) {
  const e = splitElements(slide)
  return (
    <div style={{ ...stack([]), alignItems: 'center', textAlign: 'center', justifyContent: 'center', height: '100%', gap: '18px' }}>
      {(e.title || []).map((el, i) => <ElementRenderer key={i} el={el} tokens={tokens} index={i} />)}
      {(e.subtitle || []).map((el, i) => <ElementRenderer key={`s${i}`} el={el} tokens={tokens} index={i + 1} />)}
      {(e.paragraph || []).map((el, i) => <ElementRenderer key={`p${i}`} el={el} tokens={tokens} index={i + 2} />)}
    </div>
  )
}
