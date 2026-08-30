import { useEffect, useState } from 'react'
import { filesApi } from './api'
import type { PresentationSpec, SpecElement } from '../types'

// Signed file URLs expire (~1h). Decks reference images by stable file_id —
// this module mints FRESH URLs so images never break, at load time and on
// demand while rendering.

const CACHE_TTL_MS = 50 * 60 * 1000
const cache = new Map<string, { url: string; at: number }>()

export async function resolveFileUrl(fileId: string): Promise<string | null> {
  const hit = cache.get(fileId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.url
  try {
    const res = await filesApi.url(fileId)
    cache.set(fileId, { url: res.url, at: Date.now() })
    return res.url
  } catch {
    return null
  }
}

/** Rewrite every image element's src with a fresh URL for its file_id. */
export async function normalizeSpecImageUrls(spec: PresentationSpec): Promise<PresentationSpec> {
  const pending = new Map<string, string | null>()
  let changed = false
  const slides = await Promise.all(
    spec.slides.map(async (slide) => ({
      ...slide,
      elements: await Promise.all(
        slide.elements.map(async (el: SpecElement) => {
          if (el.type !== 'image' || !el.fileId) return el
          const url = pending.has(el.fileId)
            ? pending.get(el.fileId)!
            : ((pending.set(el.fileId, (await resolveFileUrl(el.fileId)) ?? ''), pending.get(el.fileId)!) as string)
          if (!url) return el
          changed = true
          return { ...el, src: url }
        }),
      ),
    })),
  )
  return changed ? { ...spec, slides } : spec
}

/**
 * Resolves an image element's display src: a fresh signed URL when the
 * element references a file_id, otherwise the stored src as-is.
 */
export function useResolvedImageSrc(el: SpecElement): string | null {
  const [src, setSrc] = useState<string | null>(el.src ?? null)

  useEffect(() => {
    let alive = true
    if (el.type !== 'image' || !el.fileId) {
      setSrc(el.src ?? null)
      return
    }
    setSrc(el.src ?? null)
    resolveFileUrl(el.fileId).then((url) => {
      if (alive && url) setSrc(url)
    })
    return () => {
      alive = false
    }
  }, [el.fileId, el.src, el.type])

  return src
}
