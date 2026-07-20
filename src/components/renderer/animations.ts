import type { Variants } from 'framer-motion'

// Phase 9: Animation Engine.
//
// Each animation is a named preset expressed as Framer Motion variants. The
// renderer maps an element's `animation` hint (or a positional default) to
// one of these. Slides transition via the parent AnimatePresence (Phase 10);
// here we define per-element entrance + optional special treatments.

export type AnimationName =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'zoom'
  | 'rotate'
  | 'blur'
  | 'reveal'
  | 'typing'
  | 'counter'
  | 'gradient'
  | 'parallax'
  | 'sequential'

// Default animation per slide position so a deck always feels alive even
// when the spec does not specify one.
export function defaultAnimationFor(index: number): AnimationName {
  const order: AnimationName[] = ['fade', 'slide', 'scale', 'zoom', 'reveal', 'blur']
  return order[index % order.length]
}

const baseTransition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }

export const animations: Record<AnimationName, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: baseTransition },
  },
  slide: {
    hidden: { opacity: 0, x: -48 },
    visible: { opacity: 1, x: 0, transition: baseTransition },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: baseTransition },
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.4 },
    visible: { opacity: 1, scale: 1, transition: { ...baseTransition, duration: 0.8 } },
  },
  rotate: {
    hidden: { opacity: 0, rotate: -8, scale: 0.9 },
    visible: { opacity: 1, rotate: 0, scale: 1, transition: baseTransition },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(12px)' },
    visible: { opacity: 1, filter: 'blur(0px)', transition: { ...baseTransition, duration: 0.7 } },
  },
  reveal: {
    hidden: { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' },
    visible: { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', transition: { ...baseTransition, duration: 0.7 } },
  },
  typing: {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
  },
  counter: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: baseTransition },
  },
  gradient: {
    hidden: { opacity: 0, backgroundPosition: '0% 50%' },
    visible: { opacity: 1, backgroundPosition: '100% 50%', transition: { duration: 1.2, ease: 'easeInOut' } },
  },
  parallax: {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { ...baseTransition, duration: 0.9 } },
  },
  sequential: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: baseTransition },
  },
}

export const sequentialContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
