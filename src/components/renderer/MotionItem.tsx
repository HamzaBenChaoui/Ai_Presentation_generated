import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useContext, useEffect, type ReactNode } from 'react'
import { animations, defaultAnimationFor, type AnimationName } from './animations'
import { getSettings } from '../../lib/settings'
import { SlideActiveContext, SlidePresentationContext } from './slideContext'

// Per-element stagger delay (seconds). Mirrors AnimatedElement so a slide's
// title, then its first card, second card, third card... cascade in sequence.
const STAGGER_STEP = 0.09
const MAX_STAGGER = 0.6
const EXIT_STAGGER_STEP = 0.04
const MAX_EXIT_STAGGER = 0.24
// Items in rich layouts (cards, stats, timeline rows...) start cascading after
// the slide title has finished, so they don't all fire at once on slide enter.
const BASE_DELAY = 0.15
const PRESENT_ENTER_OFFSET = 0.12

interface Props {
  index: number
  children: ReactNode
  // Override the chosen animation. Defaults to a positional pattern.
  animation?: AnimationName
  // Constrain the stagger so a long list doesn't take forever.
  style?: React.CSSProperties
  className?: string
}

/**
 * Wraps a single item inside a rich layout (a card cell, a stat cell, a
 * timeline row...) with the same enter + exit choreography that AnimatedElement
 * uses for spec elements. The slide's active state (from SlideActiveContext)
 * gates whether the item plays its entrance or its dissolution.
 */
export default function MotionItem({ index, children, animation, style, className }: Props) {
  const prefersReduced = useReducedMotion()
  const enabled = getSettings().animationsEnabled && !prefersReduced
  const active = useContext(SlideActiveContext)
  const isPresentation = useContext(SlidePresentationContext)
  const controls = useAnimationControls()
  const name: AnimationName = animation || defaultAnimationFor(index)

  useEffect(() => {
    if (!enabled) {
      controls.start('visible')
      return
    }
    if (active) controls.start('visible')
    else controls.start('exit')
  }, [active, enabled, controls])

  if (!enabled) {
    return (
      <div style={style} className={className}>
        {children}
      </div>
    )
  }

  const variant = animations[name] || animations.fade
  const delay = BASE_DELAY + (isPresentation ? PRESENT_ENTER_OFFSET : 0) + Math.min(index * STAGGER_STEP, MAX_STAGGER)
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

  return (
    <motion.div
      initial="hidden"
      animate={controls}
      variants={{ hidden: variant.hidden, visible: visibleWithDelay, exit: exitWithDelay }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
