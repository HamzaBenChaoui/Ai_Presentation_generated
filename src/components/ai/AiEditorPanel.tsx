import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useEditor } from '../editor/EditorContext'
import { aiEditApi, ApiClientError } from '../../lib/api'

interface Props {
  presentationId: string
  onClose: () => void
}

interface Message {
  role: 'user' | 'ai'
  text: string
}

const QUICK_ACTIONS = [
  { label: 'Make it modern', instruction: 'make it modern' },
  { label: 'Make it minimal', instruction: 'make it minimal' },
  { label: 'Make it dark', instruction: 'make it dark' },
  { label: 'Reduce text', instruction: 'reduce text' },
  { label: 'Add statistics', instruction: 'add statistic' },
  { label: 'Add a slide', instruction: 'add slide' },
]

export default function AiEditorPanel({ presentationId, onClose }: Props) {
  const { colors } = useTheme()
  const { spec, applyAiEdit } = useEditor()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const runEdit = useCallback(async (instruction: string) => {
    if (!spec || loading) return
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', text: instruction }])
    setInput('')
    try {
      const result = await aiEditApi.run(presentationId, { instruction })
      applyAiEdit(result.spec)
      setMessages(prev => [...prev, { role: 'ai', text: result.summary }])
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'AI edit failed'
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }, [spec, loading, presentationId, applyAiEdit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    runEdit(trimmed)
  }

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${colors.border}`,
        background: colors.surface,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>AI Editor</span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '18px' }}
        >
          x
        </button>
      </div>

      {/* Quick actions */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => runEdit(action.instruction)}
            disabled={loading}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              cursor: loading ? 'default' : 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginTop: 20 }}>
            Type an instruction or use a quick action above.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: 10,
              background: msg.role === 'user' ? `${colors.accent}22` : `${colors.surface2}`,
              color: colors.text,
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: colors.textMuted, fontSize: '12px' }}>
            Slide AI is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. make it bold..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.surface2,
            color: colors.text,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${colors.accent}`,
            background: `${colors.accent}22`,
            color: colors.accent,
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
