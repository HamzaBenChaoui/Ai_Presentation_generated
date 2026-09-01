import { useEffect, useState } from 'react'
import { Sparkles, PenTool, Presentation, Cable, ArrowRight, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

// First-run welcome tour: a 4-step card walkthrough shown once on the
// dashboard. Light by design — no element spotlighting, just the essentials.
// Dismissal persists in localStorage; "Replay" is possible from Settings.

const KEY = 'slideai.onboarding.done'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

// Shared dismissal signal: the AppShell renders the page tree twice (mobile +
// desktop outlets), so the tour mounts as TWO stacked instances. Dismissing
// must hide BOTH, not just the one that received the click.
const subs = new Set<() => void>()

export function dismissOnboarding() {
  try {
    localStorage.setItem(KEY, '1')
  } catch { /* ignore */ }
  subs.forEach((fn) => fn())
}

const STEPS = [
  {
    icon: Sparkles,
    title: 'Generate your first deck',
    body:
      'Describe your topic, pick Outline first to review the slide plan before generating, then choose one of the 16 themes — or create your own custom theme with your brand colors.',
  },
  {
    icon: PenTool,
    title: 'Edit like a canvas',
    body:
      'Drag free elements with smart alignment guides, shift-click to multi-select and align, insert native charts, lock elements, right-click for quick actions and press Ctrl+K for the command palette.',
  },
  {
    icon: Presentation,
    title: 'Present, translate, export',
    body:
      'Present fullscreen with speaker notes, translate the whole deck in one click, then export to animated HTML, PDF or a real editable PowerPoint. Track viewer attention in Analytics.',
  },
  {
    icon: Cable,
    title: 'Connect your AI tools',
    body:
      'The MCP page connects ZKR, Claude Code, Cursor, Codex and other AI agents to your decks — they can read slides, take screenshots and edit presentations directly.',
  },
]

export default function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(() => !hasSeenOnboarding())

  useEffect(() => {
    const hide = () => setVisible(false)
    subs.add(hide)
    return () => { subs.delete(hide) }
  }, [])

  if (!visible) return null

  const finish = () => {
    dismissOnboarding()
    setVisible(false)
  }

  const current = STEPS[step]
  const Icon = current.icon
  const last = step === STEPS.length - 1

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
      <div className="w-[min(460px,94vw)] rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 text-accent mb-4">
          <Icon size={22} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-dim mb-1">
          Welcome to Slide AI · {step + 1}/{STEPS.length}
        </p>
        <h2 className="text-lg font-bold text-text mb-2">{current.title}</h2>
        <p className="text-sm text-text-muted leading-relaxed mb-5">{current.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === step ? 'w-5 bg-accent' : 'w-1.5 bg-border'
                }`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={finish}
              className="px-3 py-1.5 rounded-xl text-sm text-text-muted hover:text-text cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 cursor-pointer"
            >
              {last ? (
                <>
                  <Check size={14} />
                  Got it
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
