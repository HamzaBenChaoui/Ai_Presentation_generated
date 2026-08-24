import type { SlideSpec, CustomAnimationDef } from '../../types'
import type { ReactElement } from 'react'
import { defaultTokens, tokenFor, type RenderTokens } from './theme'
import * as Layouts from './Layouts'
import type { LayoutProps } from './Layouts'
import { SlideActiveContext } from './slideContext'
import AmbientBackground from './AmbientBackground'
import CustomCodeFrame from './CustomCodeFrame'
import { CustomAnimationsProvider } from './CustomAnimationsContext'

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
  // AI-authored custom animations for this deck (meta.customAnimations).
  // Validated + injected here; elements reference them via `animation`.
  customAnimations?: CustomAnimationDef[] | null
  // Whether this slide is the active (visible) one. Drives element entrance
  // animations — only the active slide animates. Defaults to true (stacked
  // view, viewer preview).
  active?: boolean
  // Fullscreen/present mode: removes the rounded corners and border so the
  // slide can edge-to-edge cover the viewport.
  presentation?: boolean
}

// Renders a single slide. The renderer auto-selects the layout from the
// spec and applies the slide-level background / theme. 16:9, responsive.
export default function SlideRenderer({ slide, themeName, background, tokens = defaultTokens, customAnimations, active = true, presentation = false }: Props) {
  const tk = tokens || tokenFor(themeName)
  const bg = background || slide.background || undefined

  // AI free-coded slide: the authored HTML/CSS/JS owns the ENTIRE 16:9 canvas
  // (no padding, no ambient layer). Hosted sandboxed — see CustomCodeFrame.
  if (slide.layout === 'custom' && slide.code) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          background: bg || tk.bg,
          borderRadius: presentation ? 0 : tk.radiusLg,
          border: presentation ? 'none' : `1px solid ${tk.border}`,
          overflow: 'hidden',
        }}
      >
        <CustomCodeFrame code={slide.code} tokens={tk} active={active} />
      </div>
    )
  }

  const Layout = slideLayout(slide.layout)
  // Image backgrounds already fill the slide — the ambient layer would sit on
  // top of the photo, so skip it for url()/data: backgrounds.
  const isImageBg = bg ? /url\(|^data:/i.test(bg) : false
  return (
    <CustomAnimationsProvider defs={customAnimations}>
      <SlideActiveContext.Provider value={active}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          background: bg || tk.bg,
          borderRadius: presentation ? 0 : tk.radiusLg,
          border: presentation ? 'none' : `1px solid ${tk.border}`,
          padding: 'clamp(24px, 4vw, 64px)',
          color: tk.text,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isImageBg && <AmbientBackground spec={tk.ambient} />}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Layout slide={slide} tokens={tk} active={active} />
        </div>
        </div>
      </SlideActiveContext.Provider>
    </CustomAnimationsProvider>
  )
}
