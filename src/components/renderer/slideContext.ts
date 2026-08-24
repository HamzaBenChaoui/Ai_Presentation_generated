import { createContext } from 'react'

// Signals whether the slide currently being rendered is the active (visible)
// one. Provided by SlideRenderer so individual element animations only play
// for the visible slide in fullscreen mode. Defaults to active.
export const SlideActiveContext = createContext<boolean>(true)

// Signals that this slide is rendered inside the fullscreen presentation
// player. Elements add a small base delay so the incoming slide starts
// entering while the outgoing slide is still dissolving (the 100-150ms
// overlap window) instead of firing at t=0.
export const SlidePresentationContext = createContext<boolean>(false)
