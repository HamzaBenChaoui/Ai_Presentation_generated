import { createContext, useContext, useMemo } from 'react'
import type { CustomAnimationDef } from '../../types'
import { buildCustomAnimationMap, type ValidatedCustomAnimation } from '../../lib/customAnimation/validate'

// Validated custom animations for the current deck. Provided by SlideRenderer
// so every layout/element can look up an animation by name. Invalid model
// output is dropped here (silent fallback to built-ins).
const CustomAnimationsContext = createContext<Record<string, ValidatedCustomAnimation>>({})

export function CustomAnimationsProvider({
  defs,
  children,
}: {
  defs: CustomAnimationDef[] | null | undefined
  children: React.ReactNode
}) {
  const map = useMemo(() => buildCustomAnimationMap(defs), [defs])
  return <CustomAnimationsContext.Provider value={map}>{children}</CustomAnimationsContext.Provider>
}

export function useCustomAnimations(): Record<string, ValidatedCustomAnimation> {
  return useContext(CustomAnimationsContext)
}
