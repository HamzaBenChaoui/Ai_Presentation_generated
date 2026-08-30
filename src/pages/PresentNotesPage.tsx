import { useEffect, useState } from 'react'
import { MonitorSpeaker } from 'lucide-react'

interface PresentState {
  type: string
  index: number
  total: number
  elapsed: number
  notes: string
  next: string
}

/**
 * Companion window for dual-screen presenting: opened from the fullscreen
 * player, it listens on a BroadcastChannel and shows speaker notes, the
 * timer and what's next while the audience screen stays clean.
 */
export default function PresentNotes() {
  const [state, setState] = useState<PresentState | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ch = params.get('ch') || 'default'
    const channel = new BroadcastChannel(`slideai-present-${ch}`)
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'state') {
        setConnected(true)
        setState(event.data as PresentState)
      }
    }
    return () => channel.close()
  }, [])

  const mm = String(Math.floor((state?.elapsed ?? 0) / 60)).padStart(2, '0')
  const ss = String((state?.elapsed ?? 0) % 60).padStart(2, '0')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0b16',
        color: '#f4f4ff',
        padding: 24,
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#a0a0c0' }}>
          <MonitorSpeaker size={16} />
          Presenter notes
        </span>
        <span style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>
          {mm}:{ss}
        </span>
      </div>

      {!connected || !state ? (
        <p style={{ color: '#6b6b8a', fontSize: 14 }}>
          Waiting for the presentation…
          <br />
          Open your deck in present mode and click the dual-screen button.
        </p>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#a0a0c0' }}>
            Slide {state.index + 1} / {state.total}
            {state.next ? ` — next: ${state.next}` : ' (last slide)'}
          </div>
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 18,
              fontSize: 16,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
            }}
          >
            {state.notes || 'No speaker notes on this slide.'}
          </div>
        </>
      )}
    </div>
  )
}
