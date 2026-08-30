// Custom AI animation pipeline.
//
// PHILOSOPHY — the model is a creative peer, not an adversary. This module
// exists to make its animations WORK, not to police design taste:
//
//   1. SECURITY ONLY: strip/reject genuinely dangerous constructs (url(),
//      expression(), javascript:, @import, behavior:). Nothing else.
//   2. SANITIZE + REBUILD: the CSS is parsed with a real parser (css-tree) and
//      rebuilt canonically — the only CSS that reaches the DOM is well-formed,
//      whatever the model wrote.
//   3. AUTO-FIX over REJECT: out-of-range durations are clamped, unknown or
//      broken easings fall back to the premium default, keyframes written with
//      the wrong @keyframes name are re-labelled. The animation survives.
//   4. Only UNPARSEABLE garbage (broken braces, invalid values for known
//      properties) drops that one animation — silently falling back to a
//      built-in so the render never breaks.

import * as csstree from 'css-tree'

export interface CustomAnimationDef {
  name: string
  keyframes: string
  duration: number
  easing?: string
  // Extra delay (ms) before the animation starts.
  delay?: number
  // Repeat count — a positive integer or the literal "infinite".
  loop?: number | 'infinite'
}

export interface ValidatedCustomAnimation {
  name: string
  durationMs: number
  easing: string
  // Extra delay (ms) before the animation starts.
  delayMs: number
  // CSS animation-iteration-count (integer or 'infinite').
  iterations: number | 'infinite'
  // Canonical, sanitized @keyframes CSS — the ONLY thing that reaches the DOM.
  css: string
}

// Soft bounds — durations outside are CLAMPED, not rejected. Wide enough for
// slow ambient loops (4s) and snappy micro-hits (100ms).
export const MIN_DURATION_MS = 100
export const MAX_DURATION_MS = 4000

// Hard structural caps so one broken def can't inject megabytes of CSS.
const MAX_FRAMES = 32
const MAX_DECLS_PER_FRAME = 16
const MAX_CSS_LENGTH = 4000

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,40}$/
// Keyframe selectors: from/to/percentage (comma lists allowed).
const SELECTOR_PART_RE = /^(from|to|\d+(\.\d+)?%)$/
// Security blacklist — the ONLY content-level reason to drop an animation.
const FORBIDDEN = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|<\s*script/i

const EASE_KEYWORDS = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
])

// Default premium easing when the model omits (or botches) one — the expo-out
// we use everywhere else in the motion system.
export const DEFAULT_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Returns a usable timing function for ANY input. Valid values pass through
 * canonicalized; anything unparsable falls back to the premium default —
 * never null, because a wrong easing should not kill an animation.
 */
export function validateEasing(raw?: string | null): string {
  if (!raw) return DEFAULT_EASING
  const t = String(raw).trim().toLowerCase()
  if (!t) return DEFAULT_EASING
  if (EASE_KEYWORDS.has(t)) return t

  const cb = t.match(/^cubic-bezier\(\s*([^)]+)\)$/)
  if (cb) {
    const parts = cb[1].split(',').map((s) => Number(s.trim()))
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return DEFAULT_EASING
    const [x1, y1, x2, y2] = parts
    // x-values must stay in [0,1] per the CSS spec (browsers would ignore the
    // whole declaration otherwise); y-values may overshoot for bounce feel.
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return DEFAULT_EASING
    if (y1 < -10 || y1 > 10 || y2 < -10 || y2 > 10) return DEFAULT_EASING
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
  }

  const st = t.match(/^steps\(\s*(\d+)\s*(?:,\s*(start|end|jump-start|jump-end|jump-none|jump-both)\s*)?\)$/)
  if (st) {
    const n = Math.min(Math.max(Number(st[1]), 1), 200)
    return `steps(${n}${st[2] ? `, ${st[2]}` : ''})`
  }

  return DEFAULT_EASING
}

interface Frame {
  selector: string
  decls: { prop: string; value: string }[]
}

// Every real CSS property accepts the CSS-wide keyword `initial`; unknown /
// custom properties don't match any grammar. Used to tell "css-tree doesn't
// know this property" (accept — browser decides) apart from "known property,
// broken value" (drop — it would render as nothing).
function isKnownProperty(prop: string): boolean {
  try {
    return !csstree.lexer.matchProperty(prop, 'initial').error
  } catch {
    return false
  }
}

// Walk a list of keyframe `Rule` nodes, validating selectors + declarations.
function extractFrames(children: csstree.List<csstree.CssNode>): Frame[] | null {
  const frames: Frame[] = []
  for (const child of children) {
    if (child.type !== 'Rule') continue // tolerate stray junk between frames
    const selector = csstree.generate(child.prelude).trim()
    const parts = selector.split(',').map((s) => s.trim())
    if (!parts.length || parts.some((p) => !SELECTOR_PART_RE.test(p))) continue
    if (!child.block) continue

    const decls: Frame['decls'] = []
    for (const d of child.block.children) {
      if (d.type !== 'Declaration') continue
      const prop = d.property.toLowerCase()
      // Strict value parsing: any Raw fragment means the model wrote something
      // the CSS parser couldn't make sense of — skip just this declaration.
      if (d.value.type === 'Raw') continue
      let hasRaw = false
      csstree.walk(d.value, {
        enter(n: csstree.CssNode) {
          if (n.type === 'Raw') hasRaw = true
        },
      })
      if (hasRaw) continue
      const rawValue = csstree.generate(d.value)
      if (FORBIDDEN.test(rawValue)) continue
      // Grammar-check KNOWN properties only (catches `transform: 99foobar junk`
      // which tokenizes fine but renders as nothing). Unknown properties are
      // passed through untouched.
      if (isKnownProperty(prop) && csstree.lexer.matchProperty(prop, rawValue).error) continue
      decls.push({ prop, value: rawValue })
      if (decls.length >= MAX_DECLS_PER_FRAME) break
    }
    if (decls.length) frames.push({ selector, decls })
    if (frames.length >= MAX_FRAMES) break
  }
  return frames.length ? frames : null
}

// Cheap structural pre-check: brace depth must return to 0 (css-tree silently
// auto-closes an unterminated block, so parse alone won't catch a model that
// forgets a closing brace). Comments are skipped so `/* { } */` can't fool it.
function bracesBalanced(css: string): boolean {
  let depth = 0
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      if (end === -1) return false // unterminated comment
      i = end + 1
      continue
    }
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth < 0) return false
    }
  }
  return depth === 0
}

function sanitizeKeyframes(name: string, keyframes: string): string | null {
  if (FORBIDDEN.test(keyframes)) return null
  if (!bracesBalanced(keyframes)) return null

  let ast: csstree.CssNode
  try {
    ast = csstree.parse(keyframes, { context: 'stylesheet' })
  } catch {
    return null
  }

  // Accept either a full "@keyframes <any-name> { ... }" rule or a bare body.
  // The rule's own name is irrelevant — the output is rebuilt under `name`.
  const atrules: csstree.Atrule[] = []
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      atrules.push(node)
    },
  })

  let frames: Frame[] | null = null
  if (atrules.length >= 1) {
    const at = atrules[0]
    if (at.name.toLowerCase() !== 'keyframes' || !at.prelude || !at.block) return null
    frames = extractFrames(at.block.children)
  } else {
    frames = extractFrames((ast as csstree.StyleSheet).children)
  }
  if (!frames) return null

  // Rebuild a canonical rule from the parsed AST — only validated declarations
  // survive, under the def's own (safe) name.
  let out = `@keyframes ${name} {\n`
  for (const f of frames) {
    out += `  ${f.selector} {\n`
    for (const d of f.decls) out += `    ${d.prop}: ${d.value};\n`
    out += `  }\n`
  }
  out += `}\n`
  if (out.length > MAX_CSS_LENGTH) return null
  return out
}

/** Validate a single model-provided animation. Null ⇒ unparseable/unsafe, use fallback. */
export function validateCustomAnimation(
  def: CustomAnimationDef | null | undefined,
): ValidatedCustomAnimation | null {
  if (!def || typeof def !== 'object') return null
  const name = String(def.name ?? '').trim()
  if (!NAME_RE.test(name)) return null

  const duration = Number(def.duration)
  if (!Number.isFinite(duration)) return null
  // Clamp, don't reject — a wild duration still yields a working animation.
  const ms = Math.min(Math.max(Math.round(duration), MIN_DURATION_MS), MAX_DURATION_MS)

  const easing = validateEasing(def.easing)
  const css = sanitizeKeyframes(name, String(def.keyframes ?? ''))
  if (!css) return null

  const delayMs = Math.min(Math.max(Math.round(Number(def.delay) || 0), 0), 5000)
  const iterations =
    def.loop === 'infinite' ? 'infinite' : Math.min(Math.max(Math.round(Number(def.loop) || 1), 1), 50)

  return { name, durationMs: ms, easing, delayMs, iterations, css }
}

/**
 * Validate a whole deck's customAnimations list, silently dropping only the
 * unparseable ones. First definition of a name wins. Returns the map the
 * renderer uses to look up element animations.
 */
export function buildCustomAnimationMap(
  defs: CustomAnimationDef[] | null | undefined,
): Record<string, ValidatedCustomAnimation> {
  const map: Record<string, ValidatedCustomAnimation> = {}
  if (!Array.isArray(defs)) return map
  for (const def of defs) {
    const v = validateCustomAnimation(def)
    if (v && !map[v.name]) map[v.name] = v
  }
  return map
}
