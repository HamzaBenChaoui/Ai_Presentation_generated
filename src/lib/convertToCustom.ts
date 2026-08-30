import type { CustomSlideCode, SlideSpec } from '../types'

/**
 * Convert a structured slide into a custom-coded slide the user (or the AI)
 * can sculpt freely. Extracts the slide's text content into a themed HTML
 * skeleton — content is preserved, composition becomes editable code.
 */
export function convertSlideToCustom(slide: SlideSpec, tokens: { bg: string; text: string; textMuted: string; accent: string; accent2: string; gradient: string; fontHeading: string; fontBody: string }): SlideSpec {
  const title = slide.elements.find((e) => e.type === 'title')?.text ?? ''
  const subtitle = slide.elements.find((e) => e.type === 'subtitle')?.text ?? ''
  const bullets = slide.elements.find((e) => e.type === 'bullets')?.items ?? []
  const paragraphs = slide.elements.filter((e) => e.type === 'paragraph').map((e) => e.text ?? '')

  const bodyItems = [
    ...paragraphs.map((p) => `<p class="reveal">${p}</p>`),
    bullets.length > 0
      ? `<ul class="reveal">\n${bullets.map((b) => `  <li>${b}</li>`).join('\n')}\n</ul>`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const code: CustomSlideCode = {
    html: `<div class="slide">
  <h1 class="reveal">${title || 'Untitled slide'}</h1>
  ${subtitle ? `<p class="subtitle reveal">${subtitle}</p>` : ''}
  ${bodyItems}
</div>`,
    css: `.slide {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  font-family: ${tokens.fontBody};
  color: ${tokens.text};
}
h1 {
  font-family: ${tokens.fontHeading};
  font-size: clamp(36px, 5vw, 68px);
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
  background: ${tokens.gradient};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.subtitle {
  font-size: clamp(18px, 2.2vw, 26px);
  color: ${tokens.textMuted};
  margin: 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: clamp(15px, 1.7vw, 21px);
}
li::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${tokens.accent};
  margin-top: 10px;
  flex-shrink: 0;
}
.reveal {
  opacity: 0;
}
.is-active .reveal {
  animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.is-active .reveal:nth-child(2) { animation-delay: 0.12s; }
.is-active .reveal:nth-child(3) { animation-delay: 0.22s; }
@keyframes riseIn {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: none; }
}`,
    js: '',
  }

  return { ...slide, layout: 'custom', code }
}
