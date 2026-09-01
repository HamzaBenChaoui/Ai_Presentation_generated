import type { SlideSpec, CustomAnimationDef } from '../../types'
import type { ReactElement } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { defaultTokens, tokenFor, type RenderTokens } from './theme'
import * as Layouts from './Layouts'
import type { LayoutProps } from './Layouts'
import { SlideActiveContext } from './slideContext'
import AmbientBackground, { AmbientGuard } from './AmbientBackground'
import CustomCodeFrame from './CustomCodeFrame'
import FreeElementLayer from './FreeElementLayer'
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
/**
 * PowerPoint-style auto-fit: if the slide's flow content is taller than the
 * slide, scale it down (min 55%) so nothing is silently clipped.
 */
function useAutoFitScale(node: HTMLDivElement | null): number {
  const [scale, setScale] = useState(1)
  const rafRef = useRef(0)

  // NOTE: the effect depends ONLY on the node — never on `scale`. Measuring
  // inside a scale-dependent effect re-ran fit() synchronously on every state
  // update, and animating content (charts) made the measurement jitter enough
  // to exceed React's nested-update limit ("Maximum update depth exceeded",
  // a.k.a. the theme-picker zoom glitch). ResizeObserver callbacks are
  // coalesced into rAF so at most one fit runs per frame.
  useLayoutEffect(() => {
    if (!node) return
    const fit = () => {
      // scrollHeight/clientHeight are transform-independent, so the
      // measurement is stable even while scaled.
      const overflow = node.scrollHeight - node.clientHeight
      setScale((cur) => {
        let next = cur
        if (overflow > 12) {
          next = Math.max(0.55, (node.clientHeight - 12) / node.scrollHeight)
        } else if (overflow <= 0) {
          // Restore only once the content actually fits again (not merely
          // within the slack band) so shrink/restore can never oscillate.
          next = 1
        }
        // Epsilon bail: animating charts jitter the ratio by tiny amounts.
        return Math.abs(cur - next) < 0.01 ? cur : next
      })
    }
    fit()
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(fit)
    })
    ro.observe(node)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [node])

  return scale
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
  // Pure-content rendering (slide thumbnails): no editing chrome, no
  // ambient background (30 WebGL contexts would melt thumbnails).
  nonInteractive?: boolean
}

// Renders a single slide. The renderer auto-selects the layout from the
// spec and applies the slide-level background / theme. 16:9, responsive.
export default function SlideRenderer({ slide, themeName, background, tokens = defaultTokens, customAnimations, active = true, presentation = false, nonInteractive = false }: Props) {
  // Hook called unconditionally at the top (before any early return).
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null)
  const fitScale = useAutoFitScale(stageNode)
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
        {!isImageBg && !nonInteractive && (
          <AmbientGuard>
            <AmbientBackground spec={tk.ambient} />
          </AmbientGuard>
        )}
        <div
          ref={setStageNode}
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            transform: fitScale < 1 ? `scale(${fitScale})` : undefined,
            transformOrigin: 'top left',
            width: fitScale < 1 ? `${100 / fitScale}%` : undefined,
          }}
        >
          <Layout slide={slide} tokens={tk} active={active} />
        </div>
        {/* Free-positioned (Canvas-style) elements float above the layout. */}
        <FreeElementLayer slide={slide} tokens={tk} active={active} forceStatic={nonInteractive} />
        </div>
      </SlideActiveContext.Provider>
    </CustomAnimationsProvider>
  )
}
