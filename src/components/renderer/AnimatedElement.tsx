import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { animate } from 'animejs'
import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { SpecElement } from './theme'
import { defaultTokens, type RenderTokens } from './theme'
import { animations, defaultAnimationFor, EASE_OUT, EASE_IN, EXIT_MS, type AnimationName } from './animations'
import ElementRenderer from './ElementRenderer'
import { getSettings } from '../../lib/settings'
import { useOptionalEditor } from '../editor/EditorContext'
import { SlidePresentationContext } from './slideContext'
import { useCustomAnimations } from './CustomAnimationsContext'
import type { ValidatedCustomAnimation } from '../../lib/customAnimation/validate'

interface Props {
  el: SpecElement
  index: number
  tokens?: RenderTokens
  // When false the element stays hidden (used by fullscreen mode to keep
  // inactive slides hidden). Defaults to true so elements animate on mount
  // in the stacked / viewer rendering paths.
  active?: boolean
}

// Per-element stagger delay (seconds) — each subsequent element on a slide
// waits this much longer before its entrance animation begins.
const STAGGER_STEP = 0.09
// Cap so a 10-element slide doesn't take a full second to finish animating.
const MAX_STAGGER = 0.6
// Exit stagger is tighter — the slide has to feel decisive, never dragging.
const EXIT_STAGGER_STEP = 0.045
const MAX_EXIT_STAGGER = 0.3
// In the fullscreen player, incoming elements hold a small base delay so the
// new slide starts entering while the outgoing slide is still dissolving
// (the 100-150ms choreography overlap) instead of firing at t=0.
const PRESENT_ENTER_OFFSET = 0.12

// Depth-aware default: pick an entrance flavor by element role so not every
// element moves on the same plane. Decorative accents scale in from center,
// media arrives sharpened (blur→focus), body content uses the positional cycle.
function animationFor(el: SpecElement, index: number): AnimationName {
  if (el.animation) return el.animation as AnimationName
  switch (el.type) {
    case 'icon':
      return 'scale'
    case 'image':
      return 'blur'
    case 'code':
      return 'fade'
    default:
      return defaultAnimationFor(index)
  }
}

// Wraps each spec element with a full enter + exit choreography. Entrances use
// expo-out (premium settle), exits use the faster expo-in + rise + blur so the
// outgoing slide dissolves intentionally instead of cutting.
export default function AnimatedElement({ el, index, tokens = defaultTokens, active = true }: Props) {
  const prefersReduced = useReducedMotion()
  const animationsEnabled = getSettings().animationsEnabled && !prefersReduced
  const isPresentation = useContext(SlidePresentationContext)
  const customMap = useCustomAnimations()
  // A model-authored animation applies when its name matches a validated def
  // AND doesn't collide with a built-in preset (built-ins win).
  const custom: ValidatedCustomAnimation | undefined =
    el.animation && !(el.animation in animations) ? customMap[el.animation] : undefined
  const name: AnimationName = animationFor(el, index)
  // Manual per-element delay (ms) on top of the automatic stagger.
  const manualDelayMs = Math.max(0, Number(el.animationDelay) || 0)
  const controls = useAnimationControls()
  const editor = useOptionalEditor()
  const isEditing =
    editor?.editing === true &&
    (el.type === 'title' || el.type === 'subtitle' || el.type === 'paragraph')

  useEffect(() => {
    if (!animationsEnabled) {
      // Skip the animation entirely; jump to the visible state.
      controls.start('visible')
      return
    }
    if (active) controls.start('visible')
    else controls.start('exit')
  }, [active, controls, animationsEnabled])

  // Kinetic titles: the main heading of every slide reveals word-by-word (or
  // character-by-character for short text) behind a clip mask, with a slow
  // gradient sweep on dynamic/bold themes. Editing falls back to ElementRenderer.
  const kinetic =
    animationsEnabled && el.type === 'title' && !el.animation && !isEditing

  if (!animationsEnabled) {
    // No motion wrapper — render the element directly so there is zero
    // transform/opacity animation overhead (accessibility, PDF, low-power).
    return <ElementRenderer el={el} tokens={tokens} index={index} />
  }

  // Custom AI animation path. Guarded twice: the def was already validated by a
  // real CSS parser before it reached this map, and the element below has its
  // own internal fallback style — on ANY failure it degrades to a plain CSS
  // fade instead of leaving a broken/blank element.
  if (custom && !isEditing) {
    return (
      <CustomAnimatedElement
        el={el}
        index={index}
        tokens={tokens}
        animation={custom}
        active={active}
        isPresentation={isPresentation}
      />
    )
  }

  const variant = animations[name] || animations.fade
  const depthDelay = el.type === 'icon' ? 0.07 : 0
  const delay =
    (isPresentation ? PRESENT_ENTER_OFFSET : 0) +
    depthDelay +
    manualDelayMs / 1000 +
    Math.min(index * STAGGER_STEP, MAX_STAGGER)
  const exitDelay = Math.min(index * EXIT_STAGGER_STEP, MAX_EXIT_STAGGER)

  const visibleWithDelay = {
    ...(variant.visible as object),
    transition: {
      ...((variant.visible as { transition?: object }).transition || {}),
      delay,
    },
  }
  const exitWithDelay = {
    ...(variant.exit as object),
    transition: {
      ...((variant.exit as { transition?: object }).transition || {}),
      delay: exitDelay,
    },
  }
  const variants = { hidden: variant.hidden, visible: visibleWithDelay, exit: exitWithDelay }

  let content: React.ReactNode
  if (name === 'typing')
    content = <TypingElement key={active ? 'typing-on' : 'typing-off'} el={el} tokens={tokens} active={active} />
  else if (name === 'counter')
    content = <CounterElement key={active ? 'counter-on' : 'counter-off'} el={el} tokens={tokens} active={active} />
  else if (kinetic) content = <KineticTitle el={el} tokens={tokens} active={active} />
  else content = <ElementRenderer el={el} tokens={tokens} index={index} />

  return (
    <motion.div initial="hidden" animate={controls} variants={variants}>
      {content}
    </motion.div>
  )
}

// --- Custom AI animations (CSS keyframes path) -------------------------------

// Keep track of which sanitized @keyframes blocks were already injected into
// the document so 20 stacked slides don't inject 20 copies of the same rule.
const injectedCss = new Set<string>()

// Inject a <style> once per unique CSS block. Runs before paint so the custom
// animation applies from the very first frame.
function ensureKeyframesInjected(css: string) {
  if (injectedCss.has(css)) return
  injectedCss.add(css)
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

// Renders an element with a validated, model-authored CSS animation. Entrances
// play the custom keyframes; on deactivate (fullscreen slide exit) it swaps to
// the built-in dissolve keyframe so outgoing slides still exit choreographed.
// The whole body is wrapped so any unexpected failure falls back to a plain
// CSS fade — never a blank or broken element.
function CustomAnimatedElement({
  el,
  index,
  tokens,
  animation,
  active,
  isPresentation,
}: {
  el: SpecElement
  index: number
  tokens: RenderTokens
  animation: ValidatedCustomAnimation
  active: boolean
  isPresentation: boolean
}) {
  const depthDelay = el.type === 'icon' ? 0.07 : 0
  const delay =
    (isPresentation ? PRESENT_ENTER_OFFSET : 0) +
    depthDelay +
    Math.max(0, Number(el.animationDelay) || 0) / 1000 +
    animation.delayMs / 1000 +
    Math.min(index * STAGGER_STEP, MAX_STAGGER)
  const exitDelay = Math.min(index * EXIT_STAGGER_STEP, MAX_EXIT_STAGGER)

  useLayoutEffect(() => {
    try {
      ensureKeyframesInjected(animation.css)
    } catch {
      /* ignore — fallback style still applies */
    }
  }, [animation.css])

  let style: CSSProperties
  try {
    style = active
      ? {
          animation: `${animation.name} ${animation.durationMs}ms ${animation.easing} ${delay}s ${animation.iterations} both`,
          animationPlayState: 'running',
          willChange: 'transform, opacity, filter',
        }
      : {
          animation: `customExit ${EXIT_MS}s ${EASE_IN} ${exitDelay}s both`,
        }
  } catch {
    // Last-resort guard: never let a broken style reach the element.
    style = { animation: `customFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both` }
  }

  // key on `active` so the element remounts and the entrance replays from 0%
  // when it becomes visible again (e.g. navigating back in fullscreen).
  return (
    <div key={active ? 'enter' : 'exit'} style={style}>
      <ElementRenderer el={el} tokens={tokens} index={index} />
    </div>
  )
}

// --- Kinetic titles ---------------------------------------------------------

const TITLE_SIZES: Record<number, string> = {
  1: 'clamp(32px, 5vw, 64px)',
  2: 'clamp(26px, 3.6vw, 44px)',
  3: 'clamp(20px, 2.6vw, 32px)',
}

function KineticTitle({ el, tokens, active }: { el: SpecElement; tokens: RenderTokens; active: boolean }) {
  const text = el.text || ''
  const level = el.level || 1
  const useGradient = tokens.energy !== 'calm'
  // Short titles unfold character-by-character (more premium); long titles go
  // word-by-word so they don't take forever.
  const byChars = text.length <= 14
  const units = byChars ? Array.from(text) : text.split(/\s+/)
  const stagger = byChars ? 0.018 : 0.06

  const maskStyle: CSSProperties = {
    display: 'inline-block',
    overflow: 'hidden',
    verticalAlign: 'top',
    paddingBottom: '0.08em',
    marginBottom: '-0.08em',
  }
  const wordStyle: CSSProperties = {
    display: 'inline-block',
    ...(useGradient
      ? {
          backgroundImage: tokens.gradient,
          backgroundSize: '220% auto',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }
      : { color: tokens.text }),
  }

  return (
    <div
      style={{
        fontFamily: tokens.fontHeading,
        fontSize: TITLE_SIZES[level] || TITLE_SIZES[1],
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: '-0.02em',
        margin: 0,
      }}
    >
      {units.map((u, i) => (
        <span key={i} style={maskStyle}>
          <motion.span
            style={wordStyle}
            initial={{ y: '115%' }}
            animate={active ? { y: '0%' } : undefined}
            transition={{ y: { duration: 0.7, ease: EASE_OUT, delay: i * stagger } }}
          >
            {u}
          </motion.span>
          {!byChars && i < units.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </div>
  )
}

// --- Special treatments -----------------------------------------------------

function TypingElement({ el, tokens, active }: { el: SpecElement; tokens: RenderTokens; active: boolean }) {
  const text = el.text || ''
  const [shown, setShown] = useState(active ? 0 : text.length)
  useEffect(() => {
    if (!active) return // keep current text — the wrapper handles the exit fade
    let i = 0
    const id = setInterval(() => {
      i += 2
      setShown(Math.min(i, text.length))
      if (i >= text.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [active, text])
  return (
    <div style={{ fontFamily: tokens.fontHeading, fontSize: 'clamp(20px, 2.6vw, 34px)', fontWeight: 800, color: tokens.text }}>
      {text.slice(0, shown)}
      {active && shown < text.length && <span style={{ opacity: 0.6 }}>|</span>}
    </div>
  )
}

// Counts a numeric value up from zero with an expo-out ease (anime.js), then
// pops (scale 1 → 1.06 → 1) the instant it lands on its final value. The
// number itself is written straight to the DOM node each frame — zero React
// re-renders during the count.
function CounterElement({ el, tokens, active }: { el: SpecElement; tokens: RenderTokens; active: boolean }) {
  const raw = el.text || ''
  const match = raw.match(/-?\d+(\.\d+)?/)
  const target = match ? parseFloat(match[0]) : 0
  const decimals = match?.[0].includes('.') ? 1 : 0
  const prefix = raw.slice(0, raw.indexOf(match?.[0] || ''))
  const suffix = raw.slice((match?.index || 0) + (match?.[0].length || 0))
  const numRef = useRef<HTMLSpanElement>(null)
  const [popped, setPopped] = useState(false)

  useEffect(() => {
    if (!active) return // keep value — the wrapper handles the exit fade
    const node = numRef.current
    if (!node) return
    const proxy = { v: 0 }
    node.textContent = (0).toFixed(decimals)
    const anim = animate(proxy, {
      v: target,
      duration: 900,
      ease: 'outExpo',
      onUpdate: () => {
        node.textContent = proxy.v.toFixed(decimals)
      },
      onComplete: () => setPopped(true),
    })
    return () => {
      anim.pause()
    }
  }, [active, target, decimals])

  return (
    <motion.div
      animate={popped ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={popped ? { duration: 0.45, ease: EASE_OUT } : { duration: 0 }}
      style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: 'clamp(40px, 8vw, 96px)', color: tokens.text }}
    >
      {prefix}
      <span ref={numRef}>{active ? (0).toFixed(decimals) : target.toFixed(decimals)}</span>
      {suffix}
    </motion.div>
  )
}
