// Live render diagnostics — the AI's "eyes" without vision.
//
// The frontend measures the actual bounding boxes of the free-positioned
// elements rendered on the slide the user is viewing and reports geometry
// problems: off-slide placement, element overlaps, and truncated text.
// These diagnostics ride along with each chat message and are injected into
// the model's system prompt, so it can FIX what is actually wrong on screen
// even though the provider's models cannot read images.

export interface SlideDiagnostic {
  element_index: number
  problem: string
  detail: string
}

interface Box {
  index: number
  left: number // percent of slide width
  top: number
  right: number
  bottom: number
  truncated: boolean
  text: string
}

const MAX_DIAGNOSTICS = 20

function describe(el: HTMLElement): string {
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ')
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}

export function collectSlideDiagnostics(root: HTMLElement | null): SlideDiagnostic[] {
  if (!root) return []
  const slideRect = root.getBoundingClientRect()
  if (!slideRect.width || !slideRect.height) return []

  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-free-el]'))
  const boxes: Box[] = []
  for (const node of nodes) {
    const index = Number(node.dataset.freeEl)
    if (!Number.isFinite(index)) continue
    const r = node.getBoundingClientRect()
    boxes.push({
      index,
      left: ((r.left - slideRect.left) / slideRect.width) * 100,
      top: ((r.top - slideRect.top) / slideRect.height) * 100,
      right: ((r.right - slideRect.left) / slideRect.width) * 100,
      bottom: ((r.bottom - slideRect.top) / slideRect.height) * 100,
      truncated: node.scrollHeight > node.clientHeight + 4,
      text: describe(node),
    })
  }

  const diagnostics: SlideDiagnostic[] = []

  for (const b of boxes) {
    if (b.left < -0.5 || b.top < -0.5 || b.right > 100.5 || b.bottom > 100.5) {
      diagnostics.push({
        element_index: b.index,
        problem: 'overflows-slide',
        detail: `element "${b.text}" extends outside the slide (box ${b.left.toFixed(0)}%,${b.top.toFixed(0)}% → ${b.right.toFixed(0)}%,${b.bottom.toFixed(0)}%)`,
      })
    }
    if (b.truncated) {
      diagnostics.push({
        element_index: b.index,
        problem: 'text-truncated',
        detail: `element "${b.text}" text does not fit its box — shorten the text, increase width (w), or reduce font size`,
      })
    }
  }

  // Structured-layout clipping — measured VISUALLY (bounding rect includes
  // the auto-fit transform), so a slide already fitted is not flagged.
  const contentDiv = root.querySelector(':scope > div:not([data-free-layer])')
  if (contentDiv instanceof HTMLElement) {
    const cr = contentDiv.getBoundingClientRect()
    const overflowBottom = cr.bottom - slideRect.bottom
    const overflowRight = cr.right - slideRect.right
    if (overflowBottom > 8 || overflowRight > 8) {
      diagnostics.push({
        element_index: -1,
        problem: 'content-overflows-layout',
        detail: `the slide's structured content exceeds the slide visually by ~${Math.round(Math.max(overflowBottom, overflowRight))}px — split the content across slides or shorten text`,
      })
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const interW = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const interH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (interW <= 0 || interH <= 0) continue
      const interArea = interW * interH
      const areaA = (a.right - a.left) * (a.bottom - a.top)
      const areaB = (b.right - b.left) * (b.bottom - b.top)
      const minArea = Math.min(areaA, areaB)
      if (minArea > 0 && interArea / minArea > 0.12) {
        const pct = Math.round((interArea / minArea) * 100)
        diagnostics.push({
          element_index: a.index,
          problem: 'elements-overlap',
          detail: `element ${a.index} ("${a.text}") overlaps element ${b.index} ("${b.text}") by ${pct}% of the smaller one`,
        })
      }
    }
  }

  return diagnostics.slice(0, MAX_DIAGNOSTICS)
}
