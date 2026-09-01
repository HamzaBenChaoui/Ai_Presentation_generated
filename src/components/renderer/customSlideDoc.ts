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
<!-- Sandbox policy: inline scripts/styles only, no network (fonts/images must
     be inline data:). Prevents font-parse (OTS) errors from external URLs. -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src data:; worker-src blob:;">
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
<script>
/* Compatibility shim, runs BEFORE the authored code. Free models often write
   document.getElementsByTagName("canvas").getContext(...) — an HTMLCollection
   has no getContext, and the slide used to die on a TypeError. Forward the
   canvas methods to the collection's FIRST element so the intent works. */
(function () {
  function forward(method) {
    return function () {
      var first = this && this.length ? this[0] : null;
      return first && typeof first[method] === 'function'
        ? first[method].apply(first, arguments)
        : undefined;
    };
  }
  [window.HTMLCollection, window.NodeList].forEach(function (Ctor) {
    if (!Ctor || !Ctor.prototype) return;
    ['getContext', 'toDataURL'].forEach(function (m) {
      if (!(m in Ctor.prototype)) {
        try {
          Object.defineProperty(Ctor.prototype, m, { value: forward(m), configurable: true });
        } catch (e) { /* older engine — the hint fallback still applies */ }
      }
    });
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
} catch (err) {
  var msg = err && err.message ? err.message : String(err);
  var hint = '';
  if (msg.indexOf('getContext') !== -1) {
    hint = ' Hint: grab the canvas with document.querySelector("canvas") (a single <canvas> element) and check it is not null before calling getContext.';
  } else if (msg.indexOf('null') !== -1) {
    hint = ' Hint: an element id did not match — check your HTML ids.';
  }
  console.error('[custom slide] ' + msg + '.' + hint);
}
</script>
</body>
</html>`
}
