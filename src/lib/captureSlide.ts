/**
 * Capture the slide currently shown in the editor canvas as a PNG data URL.
 *
 * The backend attaches the screenshot to the LLM request only when the
 * selected model actually reads images (probed per model); otherwise the AI
 * relies on the spatial text-visualization in its system prompt. Any capture
 * failure is silent — the chat must never break over this.
 */
export async function captureSlideScreenshot(): Promise<string | null> {
  try {
    const { toPng } = await import('html-to-image')
    const node = document.getElementById('editor-slide-capture')?.firstElementChild
    if (!(node instanceof HTMLElement)) return null
    return await toPng(node, { pixelRatio: 1, cacheBust: true })
  } catch {
    return null
  }
}
