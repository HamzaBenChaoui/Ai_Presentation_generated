import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, Check, Send, X, Sparkles, AlertCircle, RotateCcw, Trash2, Undo2, Pencil, BookOpen, PencilLine, PlusCircle, Trash, Palette, Wrench } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/cn'
import { useChat } from './ChatContext'
import { useEditor } from '../editor/EditorContext'
import type { ToolStep } from '../../types'

interface Props {
  presentationId: string
  onClose: () => void
}

// Maps a tool name to an icon + label for the Claude-Code style step display.
function toolMeta(name: string): { icon: React.ReactNode; label: string } {
  const n = name.toLowerCase()
  if (n.includes('read') || n.includes('detail') || n.includes('get')) {
    return { icon: <BookOpen size={11} />, label: `Reading ${name.replace(/^get_|_detail$/g, '').replace(/_/g, ' ') || 'slide'}...` }
  }
  if (n.includes('add')) return { icon: <PlusCircle size={11} />, label: `Adding ${name.replace(/^add_|_detail$/g, '').replace(/_/g, ' ') || 'item'}...` }
  if (n.includes('delete') || n.includes('remove')) return { icon: <Trash size={11} />, label: `Deleting ${name.replace(/^delete_|_slide$/g, '').replace(/_/g, ' ') || 'item'}...` }
  if (n.includes('theme')) return { icon: <Palette size={11} />, label: `Applying theme...` }
  if (n.includes('edit') || n.includes('update') || n.includes('rewrite') || n.includes('reduce')) {
    return { icon: <PencilLine size={11} />, label: `Editing ${name.replace(/^[a-z]+_/, '').replace(/_/g, ' ') || 'slide'}...` }
  }
  return { icon: <Wrench size={11} />, label: `Calling ${name.replace(/_/g, ' ')}...` }
}

function ToolCallStep({ step }: { step: ToolStep }) {
  const { icon, label } = toolMeta(step.name)
  return (
    <div className="flex items-center gap-1.5 my-1 text-[11px] text-text-dim font-medium">
      {step.status === 'running' ? (
        <span className="inline-block w-3 h-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin shrink-0" />
      ) : (
        <span className={cn('w-3 h-3 rounded-full grid place-items-center text-white shrink-0', step.status === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80')}>
          <span className="text-[8px] leading-none">{step.status === 'success' ? '✓' : '!'}</span>
        </span>
      )}
      <span className="opacity-70">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {step.status !== 'running' && step.summary ? (
        <span className="opacity-60 italic truncate max-w-[40%]">{step.summary}</span>
      ) : null}
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Improve content', instruction: 'Review the presentation and suggest improvements to make it more impactful and professional' },
  { label: 'Modern theme', instruction: 'Change the presentation theme to modern' },
  { label: 'Add slide', instruction: 'Add a new slide that fits the presentation narrative' },
  { label: 'Reduce text', instruction: 'Reduce text across all slides — make every point concise and impactful' },
  { label: 'Better titles', instruction: 'Rewrite all slide titles to be short, expressive, and impactful' },
  { label: 'Dark mode', instruction: 'Change the presentation theme to dark' },
  { label: 'Make it minimal', instruction: 'Change the presentation theme to minimal' },
  { label: 'Add statistics', instruction: 'Add relevant statistics with realistic data to the most appropriate slide' },
]

export default function AiEditorPanel({ presentationId: _presentationId, onClose }: Props) {
  const { messages, loading, streaming, error, send, editMessage, clear, retryLast, canEdit, accessRole } = useChat()
  const { undo, canUndo } = useEditor()
  const [input, setInput] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on messages or streaming
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, streaming])

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus()
  }, [])

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const copyToClipboard = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      // fallback
    }
  }, [])

  const startEdit = useCallback((msgId: string, msgContent: string) => {
    setEditingId(msgId)
    setEditInput(msgContent)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditInput('')
  }, [])

  const submitEdit = useCallback(() => {
    if (editingId && editInput.trim()) {
      editMessage(editingId, editInput.trim())
      setEditingId(null)
      setEditInput('')
    }
  }, [editingId, editInput, editMessage])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [submitEdit, cancelEdit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    send(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed) send(trimmed)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2">
            <Sparkles size={11} className="text-white" />
          </span>
          <span className="text-sm font-semibold text-text">Slide AI</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={undo}
              disabled={!canUndo || streaming}
              className="text-text-dim hover:text-text transition-colors cursor-pointer p-1 disabled:opacity-30 disabled:cursor-default"
              title="Undo last AI edit"
            >
              <Undo2 size={14} />
            </button>
          )}
          <button
            onClick={clear}
            className="text-text-dim hover:text-text transition-colors cursor-pointer p-1"
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text transition-colors cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick actions — editing shortcuts hidden for viewers (their tool
          menu is read-only on the backend, so the action would fail anyway). */}
      {canEdit ? (
        <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => send(action.instruction)}
              disabled={streaming || loading}
              className={cn(
                'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                'border-border bg-bg/30 hover:border-accent/40 hover:bg-accent/10 hover:text-accent text-text-dim',
                'disabled:opacity-40 disabled:cursor-default',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 border-b border-border shrink-0 text-[11px] text-text-dim bg-bg/20">
          {accessRole
            ? `Read-only access (${accessRole}) — ask me anything about this deck.`
            : 'Ask me anything about this deck.'}
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center flex-1">
            <span className="text-xs text-text-dim">Loading conversation...</span>
          </div>
        )}

        {!loading && messages.length === 0 && !streaming && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-text-dim text-center px-4">
              Ask me anything about your presentation...
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id + i}
            className={cn(
              'group relative max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed shadow-sm',
              msg.role === 'user'
                ? 'self-end bg-gradient-to-br from-accent/15 to-accent2/10 border border-accent/20 text-text'
                : 'self-start bg-surface2 border border-border text-text',
            )}
          >
            {msg.role === 'assistant' ? (
              <div className="prose prose-xs prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:m-0 [&_code]:text-xs [&_pre]:bg-bg [&_pre]:rounded [&_pre]:p-1">
                {msg.tool_steps && msg.tool_steps.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-border/50 space-y-0.5">
                    {msg.tool_steps.map((step, si) => (
                      <ToolCallStep key={si} step={step} />
                    ))}
                  </div>
                )}
                <Markdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </Markdown>
                {streaming && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-3.5 bg-accent/70 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            ) : editingId === msg.id ? (
              /* Edit mode for user message */
              <textarea
                ref={editInputRef}
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={2}
                className="w-full px-2 py-1 rounded-lg border border-accent bg-bg text-text text-sm outline-none resize-none min-h-[60px]"
              />
            ) : (
              <span>{msg.content}</span>
            )}

            {msg.role === 'assistant' && !streaming && (
              <button
                onClick={() => copyToClipboard(msg.content, i)}
                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-surface border border-border text-text-dim hover:text-text cursor-pointer"
                title="Copy"
              >
                {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
              </button>
            )}

            {msg.role === 'user' && !streaming && editingId !== msg.id && (
              <button
                onClick={() => startEdit(msg.id, msg.content)}
                className="absolute -left-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-surface border border-border text-text-dim hover:text-text cursor-pointer"
                title="Edit message"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        ))}

        {/* Error banner */}
        {error && (
          <div className="self-start max-w-[90%] px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={12} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={retryLast}
              className="text-red-400 hover:text-red-300 cursor-pointer p-0.5"
              title="Retry"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3 border-t border-border shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your presentation..."
          disabled={streaming || loading}
          rows={1}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface2 text-text text-sm placeholder:text-text-dim outline-none focus:border-accent transition-colors disabled:opacity-50 resize-none min-h-[36px] max-h-[120px]"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = Math.min(target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          type="submit"
          disabled={streaming || loading || !input.trim()}
          className={cn(
            'p-2 rounded-lg bg-gradient-to-br from-accent to-accent2 text-white transition-all cursor-pointer shrink-0',
            'shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 disabled:opacity-40 disabled:cursor-default',
          )}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
