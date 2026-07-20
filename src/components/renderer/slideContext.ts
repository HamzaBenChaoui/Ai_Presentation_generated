import { createContext } from 'react'

// Signals whether the slide currently being rendered is the active (visible)
// one. Provided by SlideRenderer so individual element animations only play
// for the visible slide in fullscreen mode. Defaults to active.
export const SlideActiveContext = createContext<boolean>(true)
