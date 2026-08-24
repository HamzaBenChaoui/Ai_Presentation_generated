// Pure builder for AI free-coded slides (layout='custom'). Kept dependency-
// free (no ?raw imports) so both the iframe component and the node test
// harness can use it.
//
// Contract for the authored code:
//   - The iframe IS the 16:9 slide (width/height 100%).
//   - On activation the body gets class `is-active` and a `slide:activate`
//     event fires on window — entrance animations start then, ending settled.
//   - Available globals inside: Chart (Chart.js), anime (anime.js v4) and the
//     deck theme as window.__THEME__ + CSS variables.

import type { CustomSlideCode as Code } from '../../types'
import type { RenderTokens } from './theme'

export interface ActivateMessage {
  type: 'slide:activate' | 'slide:deactivate'
}

function cssVarBlock(tokens: RenderTokens): string {
  const vars: Record<string, string> = {
    '--bg': tokens.bg,
    '--surface': tokens.surface,
    '--surface2': tokens.surface2,
    '--border': tokens.border,
    '--text': tokens.text,
    '--text-muted': tokens.textMuted,
    '--text-dim': tokens.textDim,
    '--accent': tokens.accent,
    '--accent2': tokens.accent2,
    '--accent3': tokens.accent3,
    '--gradient': tokens.gradient,
    '--radius': tokens.radius,
    '--radius-lg': tokens.radiusLg,
    '--font-heading': tokens.fontHeading,
    '--font-body': tokens.fontBody,
  }
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join('')
}

/** Full srcdoc document for one custom slide.
 *  `libScripts` (Chart.js / anime.js UMD + theme globals) is injected by the
 *  component AFTER the listener bootstrap but BEFORE the authored JS. */
export function buildCustomSlideDoc(
  code: Code,
  tokens: RenderTokens,
  libScripts = '',
): string {
  const html = String(code.html ?? '')
  const css = String(code.css ?? '')
  const js = String(code.js ?? '')
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  :root { ${cssVarBlock(tokens)} }
  html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden;
    background:var(--bg); color:var(--text);
    font-family:var(--font-body), system-ui, sans-serif; box-sizing:border-box; }
  *, *::before, *::after { box-sizing: inherit; }
</style>
<style>${css}</style>
</head>
<body>
${html}
<script>
(function () {
  var activate = function () {
    document.body.classList.add('is-active');
    window.dispatchEvent(new CustomEvent('slide:activate'));
  };
  var deactivate = function () {
    document.body.classList.remove('is-active');
    window.dispatchEvent(new CustomEvent('slide:deactivate'));
  };
  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d) return;
    if (d.type === 'slide:activate') activate();
    else if (d.type === 'slide:deactivate') deactivate();
  });
})();
</script>
${libScripts}
<script>
(function () {
  var activate = function () {
    document.body.classList.add('is-active');
    window.dispatchEvent(new CustomEvent('slide:activate'));
  };
  if (document.body.classList.contains('is-active')) activate();
})();
</script>
<script>
try {
${js}
} catch (err) { console.error('[custom slide]', err); }
</script>
</body>
</html>`
}
