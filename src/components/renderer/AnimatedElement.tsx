import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { SpecElement } from './theme'
import { defaultTokens, type RenderTokens } from './theme'
import { animations, defaultAnimationFor, type AnimationName } from './animations'
import ElementRenderer from './ElementRenderer'

interface Props {
  el: SpecElement
  index: number
  tokens?: RenderTokens
  // When false the element stays hidden (used by fullscreen mode to keep
  // inactive slides hidden). Defaults to true so elements animate on mount
  // in the stacked / viewer rendering paths.
  active?: boolean
}

// Wraps each spec element with a Framer Motion entrance animation. The
// animation is chosen from el.animation, else a positional default. Special
// treatments: `typing` reveals text character-by-character; `counter`
// counts a numeric value up from zero.
export default function AnimatedElement({ el, index, tokens = defaultTokens, active = true }: Props) {
  const name: AnimationName = (el.animation as AnimationName) || defaultAnimationFor(index)
  const controls = useAnimationControls()

  useEffect(() => {
    if (active) controls.start('visible')
    else controls.start('hidden')
  }, [active, controls])

  if (name === 'typing') return <TypingElement el={el} tokens={tokens} active={active} />
  if (name === 'counter') return <CounterElement el={el} tokens={tokens} active={active} />

  const variant = animations[name] || animations.fade
  return (
    <motion.div initial="hidden" animate={controls} variants={variant}>
      <ElementRenderer el={el} tokens={tokens} index={index} />
    </motion.div>
  )
}

function TypingElement({ el, tokens, active }: { el: SpecElement; tokens: RenderTokens; active: boolean }) {
  const text = el.text || ''
  const [shown, setShown] = useState(active ? text.length : 0)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(0)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(0)
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

function CounterElement({ el, tokens, active }: { el: SpecElement; tokens: RenderTokens; active: boolean }) {
  const raw = el.text || ''
  const match = raw.match(/-?\d+(\.\d+)?/)
  const target = match ? parseFloat(match[0]) : 0
  const prefix = raw.slice(0, raw.indexOf(match?.[0] || ''))
  const suffix = raw.slice((match?.index || 0) + (match?.[0].length || 0))
  const [val, setVal] = useState(active ? 0 : target)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVal(target)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVal(0)
    const duration = 900
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target])
  return (
    <div style={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: 'clamp(40px, 8vw, 96px)', color: tokens.text }}>
      {prefix}
      {val}
      {suffix}
    </div>
  )
}
