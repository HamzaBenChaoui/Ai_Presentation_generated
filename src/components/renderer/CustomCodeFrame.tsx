import { useEffect, useMemo, useRef } from 'react'
// UMD bundles injected verbatim into every custom slide, so AI-authored code
// can call `Chart` and `anime` globals directly — offline, no CDN needed.
// (Direct file paths: the packages' exports maps don't expose the UMD builds.)
import chartUmd from '../../../node_modules/chart.js/dist/chart.umd.js?raw'
import animeUmd from '../../../node_modules/animejs/dist/bundles/anime.umd.min.js?raw'
import type { CustomSlideCode } from '../../types'
import type { RenderTokens } from './theme'
import { buildCustomSlideDoc, type ActivateMessage } from './customSlideDoc'

// Free-coded slides: the AI writes real HTML/CSS/JS for a slide and we host it
// inside a SANDBOXED iframe (allow-scripts only → unique opaque origin, no
// access to parent DOM, cookies or localStorage). The parent talks to the
// slide over postMessage; Chart.js + anime.js are preloaded as globals.

interface Props {
  code: CustomSlideCode
  tokens: RenderTokens
  active?: boolean
}

export default function CustomCodeFrame({ code, tokens, active = true }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  // Rebuild the doc only when the authored code changes — token tweaks or
  // unrelated re-renders must not reload (and re-animate) the iframe.
  // Chart.js + anime.js UMD are injected before the authored JS so its
  // globals exist when the AI's code runs. Theme subset exposed as __THEME__.
  const themeGlobal = useMemo(
    () =>
      `window.__THEME__ = ${JSON.stringify({
        bg: tokens.bg,
        text: tokens.text,
        accent: tokens.accent,
        accent2: tokens.accent2,
        accent3: tokens.accent3,
        gradient: tokens.gradient,
        fontHeading: tokens.fontHeading,
        fontBody: tokens.fontBody,
      })};`,
    [tokens.bg, tokens.text, tokens.accent, tokens.accent2, tokens.accent3, tokens.gradient, tokens.fontHeading, tokens.fontBody],
  )
  const doc = useMemo(
    () => buildCustomSlideDoc(code, tokens, `<script>${chartUmd}</script>\n<script>${animeUmd}</script>\n<script>${themeGlobal}</script>`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code.html, code.css, code.js, themeGlobal],
  )

  useEffect(() => {
    const win = frameRef.current?.contentWindow
    if (!win) return
    const msg: ActivateMessage = { type: active ? 'slide:activate' : 'slide:deactivate' }
    try {
      win.postMessage(msg, '*')
    } catch {
      /* iframe not ready yet — it starts active by default */
    }
  }, [active, doc])

  return (
    <iframe
      ref={frameRef}
      title="AI-authored slide"
      srcDoc={doc}
      // allow-scripts ONLY: unique opaque origin — the coded slide can run any
      // JS but cannot touch the parent app, storage or cross-origin frames.
      sandbox="allow-scripts"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
      }}
    />
  )
}
