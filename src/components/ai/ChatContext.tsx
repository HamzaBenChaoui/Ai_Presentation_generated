import {
  createContext,
  useState,
  useCallback,
  useRef,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'
import { chatApi } from '../../lib/api'
import type { ChatMessage, PresentationSpec, ToolStep } from '../../types'
import { useEditor } from '../editor/EditorContext'

// --- types -------------------------------------------------------------------

interface ChatContextValue {
  messages: ChatMessage[]
  loading: boolean
  streaming: boolean
  error: string | null
  /** Caller's role on this presentation. Drives UI affordances (viewers = read-only). */
  accessRole: string | null
  /** True when the caller can edit (owner/admin/editor). False for viewers. */
  canEdit: boolean
  send: (text: string) => Promise<void>
  editMessage: (msgId: string, newText: string) => Promise<void>
  clear: () => Promise<void>
  retryLast: () => Promise<void>
  reload: () => Promise<void>
}

interface Props {
  children: ReactNode
  presentationId: string
  currentSlideIndex: number
  onSpecUpdate?: (spec: PresentationSpec) => void
}

// --- context ----------------------------------------------------------------

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}

// --- provider ----------------------------------------------------------------

export function ChatProvider({ children, presentationId, currentSlideIndex, onSpecUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessRole, setAccessRole] = useState<string | null>(null)
  const { applyAiEdit } = useEditor()

  const canEdit = accessRole === 'owner' || accessRole === 'admin' || accessRole === 'editor'

  const lastUserTextRef = useRef<string>('')
  const mountedRef = useRef(true)

  // --- load history on mount ---

  const reload = useCallback(async () => {
    if (!presentationId) return
    setLoading(true)
    try {
      const res = await chatApi.list(presentationId)
      setMessages(res.messages)
      setAccessRole(res.access_role ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    mountedRef.current = true
    reload()
    return () => { mountedRef.current = false }
  }, [reload])

  // --- send message ---

  const send = useCallback(async (text: string) => {
    if (!presentationId || streaming) return
    lastUserTextRef.current = text
    setError(null)

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    // Placeholder for streaming assistant
    const streamPlaceholder: ChatMessage = {
      id: `stream-${Date.now()}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg, streamPlaceholder])
    setStreaming(true)

    let fullContent = ''
    const toolSteps: ToolStep[] = []

    try {
      const stream = chatApi.stream(presentationId, text, currentSlideIndex)

      for await (const { event, data } of stream) {
        if (!mountedRef.current) return

        const parsed = JSON.parse(data)

        if (event === 'token') {
          fullContent += parsed.delta
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.id === streamPlaceholder.id) {
              updated[updated.length - 1] = { ...last, content: fullContent, tool_steps: [...toolSteps] }
            }
            return updated
          })
        } else if (event === 'spec_update') {
          const spec = parsed.spec as PresentationSpec
          applyAiEdit(spec)
          onSpecUpdate?.(spec)
        } else if (event === 'tool_call') {
          // Push a running step so the frontend shows it immediately, Claude-Code style.
          toolSteps.push({
            name: parsed.name,
            arguments: parsed.arguments ?? {},
            status: 'running',
          })
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.id === streamPlaceholder.id) {
              updated[updated.length - 1] = { ...last, content: fullContent, tool_steps: [...toolSteps] }
            }
            return updated
          })
        } else if (event === 'tool_result') {
          // Mark the matching running step as finished.
          const step = toolSteps.find(s => s.status === 'running' && s.name === parsed.name)
          if (step) {
            step.status = parsed.success ? 'success' : 'error'
            step.summary = parsed.summary
          }
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.id === streamPlaceholder.id) {
              updated[updated.length - 1] = { ...last, content: fullContent, tool_steps: [...toolSteps] }
            }
            return updated
          })
        } else if (event === 'done') {
          // Replace placeholder with final persisted message, keeping tool steps.
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.id === streamPlaceholder.id) {
              updated[updated.length - 1] = {
                id: parsed.message_id || last.id,
                role: 'assistant',
                content: parsed.content || fullContent,
                tool_steps: toolSteps.length > 0 ? [...toolSteps] : undefined,
                created_at: new Date().toISOString(),
              }
            }
            return updated
          })
        } else if (event === 'error') {
          // Surface a friendly explanation when the backend reports the
          // caller has read-only access, instead of a raw JSON blob.
          const raw = String(parsed.message || '')
          const isForbidden =
            raw.includes('read-only') ||
            raw.includes('view-only') ||
            /forbidden/i.test(raw) ||
            raw.startsWith('{')
          setError(
            isForbidden
              ? '⚠️ You have view-only access to this presentation. Ask me a question instead, or ask an editor to make changes for you.'
              : raw || 'AI error',
          )
        }
      }

      // If the stream ended but a tool step is still "running" (server died/crashed
      // mid-tool), surface a clear retry state instead of leaving the user to type
      // "continue" into the void.
      const stuck = toolSteps.some(s => s.status === 'running')
      if (stuck) {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.id === streamPlaceholder.id) {
            updated[updated.length - 1] = {
              ...last,
              content: fullContent,
              tool_steps: [...toolSteps],
            }
          }
          return updated
        })
        setError('The assistant stopped while running a tool. Click retry to continue.')
      }
    } catch (err) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : 'AI chat failed'
      setError(msg)
      // Remove the streaming placeholder
      setMessages(prev => prev.filter(m => m.id !== streamPlaceholder.id))
    } finally {
      setStreaming(false)
    }
  }, [presentationId, streaming, currentSlideIndex, onSpecUpdate, applyAiEdit])

  // --- retry ---

  const retryLast = useCallback(async () => {
    if (lastUserTextRef.current) {
      // Remove the last user message and any error messages
      setMessages(prev => {
        const trimmed = [...prev]
        // Remove from the end until we hit a user message
        while (trimmed.length > 0 && trimmed[trimmed.length - 1].id.startsWith('stream-')) {
          trimmed.pop()
        }
        if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === 'user') {
          trimmed.pop()
        }
        return trimmed
      })
      setError(null)
      await send(lastUserTextRef.current)
    }
  }, [send])

  // --- edit message ---

  const editMessage = useCallback(async (msgId: string, newText: string) => {
    if (streaming) return
    const trimmed = newText.trim()
    if (!trimmed) return

    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId)
      if (idx === -1) return prev
      // Remove the target message and everything after it
      return prev.slice(0, idx)
    })
    setError(null)
    await send(trimmed)
  }, [send, streaming])

  // --- clear ---

  const clear = useCallback(async () => {
    if (!presentationId) return
    try {
      await chatApi.clear(presentationId)
      setMessages([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat')
    }
  }, [presentationId])

  return (
    <ChatContext.Provider
      value={{ messages, loading, streaming, error, accessRole, canEdit, send, editMessage, clear, retryLast, reload }}
    >
      {children}
    </ChatContext.Provider>
  )
}
