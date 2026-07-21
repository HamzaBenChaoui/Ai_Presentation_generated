import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, Check, Send, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useEditor } from '../editor/EditorContext'
import { aiEditApi, type SpecEditRequest } from '../../lib/api'
import type { PresentationSpec } from '../../types'

interface Props {
  presentationId: string
  onClose: () => void
}

interface Message {
  role: 'user' | 'ai'
  text: string
}

const QUICK_ACTIONS = [
  { label: 'Make it modern', instruction: 'Change theme to modern' },
  { label: 'Make it minimal', instruction: 'Change theme to minimal' },
  { label: 'Make it dark', instruction: 'Change theme to dark' },
  { label: 'Reduce text', instruction: 'Reduce text across all slides — make every point concise and impactful' },
  { label: 'Add statistics', instruction: 'Add relevant statistics to this presentation with realistic data' },
  { label: 'Add a slide', instruction: 'Add a new slide that fits the presentation narrative' },
  { label: 'Improve wording', instruction: 'Improve the wording on all slides — make it more professional and concise' },
  { label: 'Better titles', instruction: 'Rewrite all slide titles to be short, expressive, and impactful' },
]

export default function AiEditorPanel({ presentationId, onClose }: Props) {
  const { spec, applyAiEdit } = useEditor()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading])

  const copyToClipboard = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      // fallback
    }
  }, [])

  const runEdit = useCallback(async (instruction: string) => {
    if (!spec || loading) return
    setLoading(true)
    const userMsg: Message = { role: 'user', text: instruction }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    const req: SpecEditRequest = { instruction }

    try {
      // Try streaming first, fall back to non-streaming
      let result: { spec: PresentationSpec; summary: string } | null = null
      let useStreaming = true

      try {
        const stream = aiEditApi.stream(presentationId, req)
        let thinkingDone = false

        for await (const { event, data } of stream) {
          if (event === 'thinking' && !thinkingDone) {
            thinkingDone = true
          } else if (event === 'result') {
            const parsed = JSON.parse(data)
            result = { spec: parsed.spec, summary: parsed.summary }
          } else if (event === 'error') {
            const parsed = JSON.parse(data)
            throw new Error(parsed.message || 'AI edit failed')
          }
        }

        if (!result) {
          useStreaming = false
        }
      } catch {
        useStreaming = false
      }

      if (!useStreaming || !result) {
        const res = await aiEditApi.run(presentationId, req)
        result = { spec: res.spec, summary: res.summary }
      }

      applyAiEdit(result.spec)
      setMessages(prev => [...prev, { role: 'ai', text: result.summary }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI edit failed'
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed) runEdit(trimmed)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-sm font-semibold text-text">AI Editor</span>
        </div>
        <button onClick={onClose} className="text-text-dim hover:text-text transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => runEdit(action.instruction)}
            disabled={loading}
            className={cn(
              'px-2.5 py-1 rounded-lg border border-border text-xs font-medium transition-colors cursor-pointer',
              'hover:bg-surface2 hover:text-text text-text-dim',
              'disabled:opacity-40 disabled:cursor-default',
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-text-dim text-center px-4">
              Type an instruction or use a quick action above.
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'group relative max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed',
              msg.role === 'user'
                ? 'self-end bg-accent/10 text-text'
                : 'self-start bg-surface2 text-text',
            )}
          >
            {msg.text}
            {msg.role === 'ai' && (
              <button
                onClick={() => copyToClipboard(msg.text, i)}
                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-surface border border-border text-text-dim hover:text-text cursor-pointer"
                title="Copy"
              >
                {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-surface2">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span className="text-xs text-text-dim">Slide AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-border shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. make the titles more impactful..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface2 text-text text-sm placeholder:text-text-dim outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={cn(
            'p-2 rounded-lg border border-accent text-accent transition-colors cursor-pointer',
            'hover:bg-accent/10 disabled:opacity-40 disabled:cursor-default',
          )}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}