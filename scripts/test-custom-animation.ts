// Validation pipeline test harness — run with:  node scripts/test-custom-animation.ts
//
// Demonstrates the AI custom-animation pipeline (src/lib/customAnimation/validate.ts).
// PHILOSOPHY: help the AI, don't police it. Only genuinely dangerous or
// unparseable CSS is dropped; everything else is sanitized and rebuilt:
//   - valid animations pass and produce canonical CSS
//   - layout properties (width/box-shadow/...) are ALLOWED — creative freedom
//   - out-of-range durations/easings are clamped/fallback (auto-fix)
//   - only security tokens + garbage are rejected
//
// Exit code 0 when every expectation holds, 1 otherwise.

import { validateCustomAnimation, buildCustomAnimationMap, validateEasing } from '../src/lib/customAnimation/validate.ts'
import type { CustomAnimationDef } from '../src/types/index.ts'

let failures = 0
const line = (s = '') => console.log(s)
const section = (s: string) => line(`\n== ${s} ==`)
const check = (label: string, ok: boolean, detail = '') => {
  line(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  -- ${detail}` : ''}`)
  if (!ok) failures += 1
}

// ---------------------------------------------------------------------------
// 1. Valid animations pass, output is canonical/sanitized.
// ---------------------------------------------------------------------------
section('1. VALID animations pass (sanitized CSS)')

const rise = {
  name: 'riseGlow',
  keyframes:
    '@keyframes riseGlow { 0% { opacity: 0; transform: translateY(36px) scale(0.96); filter: blur(6px) } ' +
    '60% { opacity: 1; filter: blur(0px) } 100% { opacity: 1; transform: none; filter: none } }',
  duration: 700,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
}
const v1 = validateCustomAnimation(rise)
check('riseGlow valid', v1 !== null)
if (v1) {
  check('duration kept (700)', v1.durationMs === 700)
  check('easing kept', v1.easing === 'cubic-bezier(0.16, 1, 0.3, 1)')
}

// Bare body (no @keyframes wrapper) is accepted and wrapped.
const bare = {
  name: 'tiltIn',
  keyframes:
    'from { opacity: 0; transform: rotate(-4deg) translateY(24px) } ' +
    'to { opacity: 1; transform: rotate(0) translateY(0) }',
  duration: 500,
}
const v2 = validateCustomAnimation(bare)
check('bare body wrapped', v2 !== null)
if (v2) check('output is full @keyframes', /^@keyframes tiltIn \{/m.test(v2.css))

// Multiple percentages on one selector.
const combo = validateCustomAnimation({
  ...bare,
  name: 'popIn',
  keyframes: '0%, 20% { opacity: 0; transform: scale(0.6) } 80%, 100% { opacity: 1; transform: scale(1) }',
})
check('comma selectors ok', combo !== null)

// Missing easing defaults to our premium expo-out.
const noEase = validateCustomAnimation({ ...bare, easing: undefined })
check('missing easing -> default', noEase !== null && noEase!.easing === 'cubic-bezier(0.16, 1, 0.3, 1)')

// ---------------------------------------------------------------------------
// 2. CREATIVE FREEDOM — any property is allowed and rebuilt canonically.
// ---------------------------------------------------------------------------
section('2. creative freedom (any CSS property allowed)')

const keep = (label: string, def: CustomAnimationDef, expectFragment: string) => {
  const r = validateCustomAnimation(def)
  check(`${label} accepted`, r !== null)
  if (r) check(`${label} value preserved`, r.css.includes(expectFragment), r.css.replace(/\n/g, ' '))
}

keep('glow via box-shadow', {
  ...rise,
  keyframes: '@keyframes riseGlow { 0% { box-shadow: 0 0 40px rgba(255,215,0,.8) } 100% { box-shadow: none } }',
}, 'box-shadow: 0 0 40px rgba(255,215,0,.8)')
keep('layout width animation', {
  ...rise,
  keyframes: '@keyframes riseGlow { 0% { width: 100px } 100% { width: 500px } }',
}, 'width: 500px')
keep('color shimmer', {
  ...rise,
  keyframes: '@keyframes riseGlow { 0% { color: #ff8800 } 100% { color: #ffffff } }',
}, 'color: #ff8800')
keep('letter-spacing reveal', {
  ...rise,
  keyframes: '@keyframes riseGlow { from { letter-spacing: 0.4em; opacity: 0 } to { letter-spacing: normal; opacity: 1 } }',
}, 'letter-spacing')
keep('custom property untouched', {
  ...rise,
  keyframes: '@keyframes riseGlow { from { frobnicate: 12px wiggle; opacity: 0 } to { opacity: 1 } }',
}, 'frobnicate: 12px wiggle')

// Wrong @keyframes name inside the rule → re-labelled under def.name (auto-fix).
const relabelled = validateCustomAnimation({ ...rise, keyframes: '@keyframes otherName { from { opacity: 0 } }' })
check('name mismatch auto-relabelled', relabelled !== null && relabelled!.css.includes('@keyframes riseGlow'))

// Two keyframes rules in one def → the first wins, rest ignored.
const firstWins = validateCustomAnimation({
  ...rise,
  keyframes: '@keyframes a { from { opacity: 0 } } @keyframes b { from { opacity: 1 } }',
})
check('extra keyframes rules tolerated (first wins)', firstWins !== null && /opacity:\s*0/.test(firstWins!.css))

// ---------------------------------------------------------------------------
// 3. AUTO-FIX — clamp durations, rescue easings. Never kill the animation.
// ---------------------------------------------------------------------------
section('3. auto-fix (clamp + fallback instead of reject)')

const clampedLong = validateCustomAnimation({ ...rise, duration: 8000 })
check('duration 8000ms clamped to 4000', clampedLong?.durationMs === 4000)
const clampedShort = validateCustomAnimation({ ...rise, duration: 5 })
check('duration 5ms clamped to 100', clampedShort?.durationMs === 100)

check('linear easing now allowed', validateEasing('linear') === 'linear')
check('garbage easing -> default (not null)', validateEasing('ease-out fancy') === 'cubic-bezier(0.16, 1, 0.3, 1)')
check(
  'out-of-spec bezier -> default',
  validateEasing('cubic-bezier(1.5, 0, 1, 1)') === 'cubic-bezier(0.16, 1, 0.3, 1)',
)
check('bounce y-overshoot allowed', validateEasing('cubic-bezier(0.34, 1.56, 0.64, 1)') === 'cubic-bezier(0.34, 1.56, 0.64, 1)')
check('steps() normalized', validateEasing('steps(300, end)') === 'steps(200, end)')

// ---------------------------------------------------------------------------
// 4. SECURITY + GARBAGE still rejected (the only drops).
// ---------------------------------------------------------------------------
section('4. security/garbage rejected (the only drops)')

const reject = (label: string, def: CustomAnimationDef) => {
  const r = validateCustomAnimation(def)
  check(`${label} rejected`, r === null)
}

reject('url() in value (exfil)', { ...rise, keyframes: '@keyframes riseGlow { 0% {} url(https://evil.example)' })
reject('expression() token', { ...rise, keyframes: '@keyframes riseGlow { 0% { filter: blur(expression(1)) } }' })
reject('unbalanced braces', { ...rise, keyframes: '@keyframes riseGlow { 0% { opacity: 0 ' })
reject('not keyframes (normal rule)', { ...rise, keyframes: '.foo { color: red }' })
reject('empty keyframes', { ...rise, keyframes: '@keyframes riseGlow { }' })
reject('bad selector inside', { ...rise, keyframes: '@keyframes riseGlow { #foo { opacity: 1 } }' })
reject('fully garbage value for known property', { ...rise, keyframes: '@keyframes riseGlow { 0% { transform: 99foobar junk } }' })
reject('invalid name chars', { ...rise, name: 'rise glow!' })
reject('duration NaN', { ...rise, duration: NaN })

// drop-shadow is valid filter syntax — passes.
const dropShadow = validateCustomAnimation({ ...rise, keyframes: '@keyframes riseGlow { 0% { filter: drop-shadow(0 0 6px gold) } 100% { filter: none } }' })
check('drop-shadow filter ok', dropShadow !== null)

// ---------------------------------------------------------------------------
// 5. buildCustomAnimationMap keeps everything except true garbage.
// ---------------------------------------------------------------------------
section('5. map builder')

const mixed = [
  { name: 'okAnim', keyframes: '@keyframes okAnim { from { opacity: 0 } to { opacity: 1 } }', duration: 300 },
  { name: 'wildWidth', keyframes: '@keyframes wildWidth { from { width: 10px } to { width: 20px } }', duration: 90000 },
  { name: 'broken', keyframes: '@keyframes broken { from { opacity: 0 ', duration: 300 },
  { name: 'okAnim', keyframes: '@keyframes okAnim { from { opacity: 0 } to { opacity: 1 } }', duration: 999 },
  'not even an object' as unknown as CustomAnimationDef,
]
const map = buildCustomAnimationMap(mixed)
check('valid def survives', map['okAnim'] !== undefined)
check('width def survives with clamped duration', map['wildWidth']?.durationMs === 4000)
check('unparseable dropped', map['broken'] === undefined)
check('duplicate name: first wins', map['okAnim']?.durationMs === 300)
check('non-object dropped', Object.keys(map).length === 2)

// ---------------------------------------------------------------------------
// 6. Easing helper reference behaviour.
// ---------------------------------------------------------------------------
section('6. easing validation')

check('default easing is expo-out', validateEasing() === 'cubic-bezier(0.16, 1, 0.3, 1)')
check('ease-in-out passthrough', validateEasing('ease-in-out') === 'ease-in-out')
check('linear passthrough', validateEasing('linear') === 'linear')
check('cubic-bezier ok', validateEasing('cubic-bezier(0.2, 0, 0.8, 1)') === 'cubic-bezier(0.2, 0, 0.8, 1)')

// ---------------------------------------------------------------------------
// 7. End-to-end fixture decks (scripts/fixtures/*.json). Each deck is validated
//    as the renderer would: meta.customAnimations → buildCustomAnimationMap.
// ---------------------------------------------------------------------------
section('7. fixture decks (scripts/fixtures/*.json)')

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PresentationSpec } from '../src/types/index.ts'

const fixturesDir = join(import.meta.dirname, 'fixtures')
const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json')).sort()

for (const file of fixtureFiles) {
  const raw = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')) as PresentationSpec & {
    meta: { _expectValid?: string[] }
  }
  const defs = raw.meta?.customAnimations ?? null
  const map = buildCustomAnimationMap(defs)

  // The fixture itself documents which names must survive vs drop.
  const expectedValid: string[] = raw.meta?._expectValid ?? []
  for (const def of defs ?? []) {
    const shouldSurvive = expectedValid.includes(String((def as CustomAnimationDef).name))
    const survived = map[String((def as CustomAnimationDef).name)] !== undefined
    check(
      `${file} → "${String((def as CustomAnimationDef).name)}" ${shouldSurvive ? 'survives' : 'dropped'}`,
      survived === shouldSurvive,
    )
    if (survived) {
      const v = map[String((def as CustomAnimationDef).name)]
      check(`${file} → "${String((def as CustomAnimationDef).name)}" canonical css`, /^@keyframes \w+ \{/.test(v!.css))
      check(`${file} → "${String((def as CustomAnimationDef).name)}" duration clamped in bounds`, v!.durationMs >= 100 && v!.durationMs <= 4000)
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Free-coded slides (layout='custom'): srcdoc builder contract.
// ---------------------------------------------------------------------------
section('8. custom-code slides (buildCustomSlideDoc)')

import { buildCustomSlideDoc } from '../src/components/renderer/customSlideDoc.ts'
import { defaultTokens } from '../src/components/renderer/theme.ts'

const coded = {
  html: "<div class='stage'><h1 class='reveal'>Hi</h1></div>",
  css: '.reveal{opacity:0}',
  js: "document.addEventListener('slide:activate', function(){ anime({targets:'.reveal',opacity:1}) })",
}
const doc = buildCustomSlideDoc(coded, defaultTokens, '<script>var Chart=function(){};var anime={}</script>')

check('authored html present', doc.includes("<div class='stage'>"))
check('authored css present', doc.includes('.reveal{opacity:0}'))
check('theme CSS vars injected', doc.includes('--accent:') && doc.includes(defaultTokens.accent))
check('activation bootstrap (is-active + event)', doc.includes("classList.add('is-active')") && doc.includes("slide:activate"))
check('libs injected BEFORE authored js', doc.indexOf('var anime={}') < doc.indexOf('anime({targets'))
check('user js sandboxed in try/catch', doc.includes('try {') && doc.includes("console.error('[custom slide]'"))
check('postMessage listener for activate', doc.includes("d.type === 'slide:activate'"))

// Empty code fields must not crash the builder.
const blank = buildCustomSlideDoc({}, defaultTokens)
check('empty code tolerated', blank.includes('<body>') && blank.includes('</html>'))

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
section('RESULT')
line(`  ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
