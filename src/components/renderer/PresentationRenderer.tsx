import type { PresentationSpec } from '../../types'
import { defaultTokens, tokenFor } from './theme'
import SlideRenderer from './SlideRenderer'

interface Props {
  spec: PresentationSpec
  // When true, slides are laid out for fullscreen presentation mode
  // (one slide visible at a time). Phase 10 drives this. For Phase 8 the
  // default stacks every slide vertically so the deck is browsable.
  activeIndex?: number
  fullscreen?: boolean
}

// Renders an entire PresentationSpec. Each slide is a 16:9 card. The
// renderer is layout-agnostic: it consumes the spec, never raw HTML.
export default function PresentationRenderer({ spec, activeIndex, fullscreen }: Props) {
  if (!spec || !spec.slides || spec.slides.length === 0) {
    return <div style={{ color: defaultTokens.textMuted, padding: 40 }}>No slides to display.</div>
  }
  const tokens = tokenFor(spec.meta?.theme)

  if (fullscreen && activeIndex !== undefined) {
    const slide = spec.slides[activeIndex]
    if (!slide) return null
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SlideRenderer slide={slide} themeName={spec.meta?.theme} tokens={tokens} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', width: '100%' }}>
      {spec.slides.map((slide, i) => (
        <SlideRenderer key={i} slide={slide} themeName={spec.meta?.theme} tokens={tokens} />
      ))}
    </div>
  )
}
