import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { brandKitApi, type BrandKit } from '../lib/api'

// ── Brand kit context ────────────────────────────────────────────────────────
// Loaded once per session; applied as token overrides so EVERY deck render
// (editor, present, thumbnails, custom slides) respects the user's brand.

interface BrandKitValue {
  brand: BrandKit | null
  refresh: () => Promise<void>
  save: (patch: Partial<BrandKit>) => Promise<void>
}

const BrandKitContext = createContext<BrandKitValue>({
  brand: null,
  refresh: async () => {},
  save: async () => {},
})

export function useBrandKit(): BrandKitValue {
  return useContext(BrandKitContext)
}

export function BrandKitProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandKit | null>(null)

  const refresh = async () => {
    try {
      setBrand(await brandKitApi.get())
    } catch {
      setBrand(null)
    }
  }

  const save = async (patch: Partial<BrandKit>) => {
    const next = await brandKitApi.upsert(patch)
    setBrand(next)
  }

  useEffect(() => {
    let alive = true
    brandKitApi
      .get()
      .then((b) => {
        if (alive) setBrand(b)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <BrandKitContext.Provider value={{ brand, refresh, save }}>
      {children}
    </BrandKitContext.Provider>
  )
}

/** Apply brand overrides on top of any theme's tokens. */
export function applyBrandKit<T extends { accent: string; accent2: string; accent3?: string; fontHeading: string; fontBody: string }>(
  tokens: T,
  brand: BrandKit | null,
): T {
  if (!brand) return tokens
  return {
    ...tokens,
    ...(brand.color_primary ? { accent: brand.color_primary } : {}),
    ...(brand.color_secondary ? { accent2: brand.color_secondary } : {}),
    ...(brand.color_primary && brand.color_secondary
      ? { gradient: `linear-gradient(135deg, ${brand.color_primary}, ${brand.color_secondary})` }
      : {}),
    ...(brand.font_heading ? { fontHeading: brand.font_heading } : {}),
    ...(brand.font_body ? { fontBody: brand.font_body } : {}),
  }
}
