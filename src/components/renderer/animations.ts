import type { Variants } from 'framer-motion'

// Premium Motion Design System.
//
// Every preset now carries a full enter / exit choreography: elements animate
// IN with a controlled "expo-out" ease, and animate OUT with a faster, sharper
// "expo-in" ease plus a signature rise + blur dissolve. Entrances are longer
// than exits (0.6s vs 0.26s) so a slide never feels like it's dragging.
//
// Easing — never default / linear / ease-in-out:
//   EASE_OUT [0.16,1,0.3,1]  (expo-out)  — entrances, hard settle, no overshoot
//   EASE_IN  [0.7,0,0.84,0]  (expo-in)   — exits, fast + sharp, decisive
//   SPRING                    — controlled micro-overshoot for pops (counters)

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

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0]
export const EASE_SOFT: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Spring with a controlled micro-overshoot — elegant, never bouncy/cartoon.
export const SPRING_POP = { type: 'spring', stiffness: 520, damping: 26, mass: 0.6 } as const

// Seconds. Exits must always be shorter than entrances.
export const ENTER_MS = 0.6
export const EXIT_MS = 0.26

const enterT = { duration: ENTER_MS, ease: EASE_OUT }
const exitT = { duration: EXIT_MS, ease: EASE_IN }

export const animations: Record<AnimationName, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: enterT },
    exit: { opacity: 0, y: -20, filter: 'blur(8px)', transition: exitT },
  },
  slide: {
    hidden: { opacity: 0, x: -56, y: 8 },
    visible: { opacity: 1, x: 0, y: 0, transition: enterT },
    exit: { opacity: 0, x: 40, y: -26, filter: 'blur(8px)', transition: exitT },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.86 },
    visible: { opacity: 1, scale: 1, transition: enterT },
    exit: { opacity: 0, scale: 0.92, y: -20, filter: 'blur(8px)', transition: exitT },
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.4 },
    visible: { opacity: 1, scale: 1, transition: { ...enterT, duration: 0.8 } },
    exit: { opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: exitT },
  },
  rotate: {
    hidden: { opacity: 0, rotate: -8, scale: 0.9 },
    visible: { opacity: 1, rotate: 0, scale: 1, transition: enterT },
    exit: { opacity: 0, rotate: 10, scale: 0.94, filter: 'blur(8px)', transition: exitT },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(14px)' },
    visible: { opacity: 1, filter: 'blur(0px)', transition: { ...enterT, duration: 0.7 } },
    exit: { opacity: 0, filter: 'blur(12px)', transition: exitT },
  },
  reveal: {
    hidden: { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' },
    visible: { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', transition: { ...enterT, duration: 0.7 } },
    exit: { opacity: 0, y: -28, clipPath: 'inset(0 0 100% 0)', filter: 'blur(8px)', transition: exitT },
  },
  typing: {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
    exit: { opacity: 0, y: -16, filter: 'blur(8px)', transition: exitT },
  },
  counter: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: enterT },
    exit: { opacity: 0, y: -16, filter: 'blur(8px)', transition: exitT },
  },
  gradient: {
    hidden: { opacity: 0, backgroundPosition: '0% 50%' },
    visible: { opacity: 1, backgroundPosition: '100% 50%', transition: { duration: 1.4, ease: EASE_SOFT } },
    exit: { opacity: 0, filter: 'blur(8px)', transition: exitT },
  },
  parallax: {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { ...enterT, duration: 0.9 } },
    exit: { opacity: 0, y: -32, filter: 'blur(10px)', transition: exitT },
  },
  sequential: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: enterT },
    exit: { opacity: 0, y: -20, filter: 'blur(8px)', transition: exitT },
  },
}

export const sequentialContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
