import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { animations, defaultAnimationFor, type AnimationName } from './animations'
import { getSettings } from '../../lib/settings'

// Per-element stagger delay (seconds). Mirrors AnimatedElement so a slide's
// title, then its first card, second card, third card... cascade in sequence.
const STAGGER_STEP = 0.09
const MAX_STAGGER = 0.6
// Items in rich layouts (cards, stats, timeline rows...) start cascading after
// the slide title has finished, so they don't all fire at once on slide enter.
const BASE_DELAY = 0.15

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
 * timeline row...) with the same entrance animation + stagger logic that
 * AnimatedElement uses for spec elements. Respects the user's
 * `animationsEnabled` setting: when off, renders children without motion.
 */
export default function MotionItem({ index, children, animation, style, className }: Props) {
  const enabled = getSettings().animationsEnabled
  const controls = useAnimationControls()
  const name: AnimationName = animation || defaultAnimationFor(index)

  useEffect(() => {
    if (!enabled) {
      controls.start('visible')
      return
    }
    controls.start('visible')
  }, [enabled, controls])

  if (!enabled) {
    return (
      <div style={style} className={className}>
        {children}
      </div>
    )
  }

  const variant = animations[name] || animations.fade
  const delay = BASE_DELAY + Math.min(index * STAGGER_STEP, MAX_STAGGER)
  const visibleWithDelay = {
    ...(variant.visible as object),
    transition: {
      ...((variant.visible as { transition?: object }).transition || {}),
      delay,
    },
  }

  return (
    <motion.div
      initial="hidden"
      animate={controls}
      variants={{ hidden: variant.hidden, visible: visibleWithDelay }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
