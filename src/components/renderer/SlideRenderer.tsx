import type { SlideSpec } from '../../types'
import type { ReactElement } from 'react'
import { defaultTokens, tokenFor, type RenderTokens } from './theme'
import * as Layouts from './Layouts'
import type { LayoutProps } from './Layouts'
import { SlideActiveContext } from './slideContext'

const registry: Record<string, (p: LayoutProps) => ReactElement> = {
  hero: Layouts.Hero,
  title: Layouts.Title,
  agenda: Layouts.Agenda,
  section: Layouts.Section,
  timeline: Layouts.Timeline,
  comparison: Layouts.Comparison,
  cards: Layouts.Cards,
  statistics: Layouts.Statistics,
  pricing: Layouts.Pricing,
  gallery: Layouts.Gallery,
  process: Layouts.Process,
  flow: Layouts.Flow,
  roadmap: Layouts.Roadmap,
  team: Layouts.Team,
  quote: Layouts.Quote,
  swot: Layouts.SWOT,
  table: Layouts.Table,
  chart: Layouts.Chart,
  'image-left': Layouts.ImageLeft,
  'image-right': Layouts.ImageRight,
  cta: Layouts.CTA,
  conclusion: Layouts.Conclusion,
  'thank-you': Layouts.ThankYou,
  diagram: Layouts.Diagram,
  code: Layouts.CodeLayout,
  'icon-grid': Layouts.IconGrid,
  features: Layouts.Features,
  'numbered-list': Layouts.NumberedList,
  'big-stat': Layouts.BigStat,
  'two-column': Layouts.TwoColumn,
  testimonials: Layouts.Testimonials,
  cover: Layouts.Cover,
  bullets: Layouts.BulletsLayout,
}

export function slideLayout(name?: string): (p: LayoutProps) => ReactElement {
  return registry[name || ''] || Layouts.Title
}

interface Props {
  slide: SlideSpec
  themeName?: string | null
  background?: string | null
  tokens?: RenderTokens
  // Whether this slide is the active (visible) one. Drives element entrance
  // animations — only the active slide animates. Defaults to true (stacked
  // view, viewer preview).
  active?: boolean
}

// Renders a single slide. The renderer auto-selects the layout from the
// spec and applies the slide-level background / theme. 16:9, responsive.
export default function SlideRenderer({ slide, themeName, background, tokens = defaultTokens, active = true }: Props) {
  const Layout = slideLayout(slide.layout)
  const tk = tokens || tokenFor(themeName)
  const bg = background || slide.background || undefined
  return (
    <SlideActiveContext.Provider value={active}>
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          background: bg || 'var(--slide-bg, #0b0b16)',
          borderRadius: tk.radiusLg,
          border: `1px solid ${tk.border}`,
          padding: 'clamp(24px, 4vw, 64px)',
          color: tk.text,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Layout slide={slide} tokens={tk} active={active} />
      </div>
    </SlideActiveContext.Provider>
  )
}
