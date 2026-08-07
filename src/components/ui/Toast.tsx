import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null)

function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('Toast hooks must be used within <ToastProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Icons map                                                          */
/* ------------------------------------------------------------------ */

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}

/* ------------------------------------------------------------------ */
/*  ToastRow                                                            */
/* ------------------------------------------------------------------ */

function ToastRow({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const Icon = iconMap[item.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg',
        'max-w-sm text-sm text-text',
      )}
    >
      <Icon size={18} className={cn('shrink-0', colorMap[item.type])} />
      <span className="flex-1">{item.message}</span>
      <button onClick={onRemove} className="shrink-0 text-text-dim hover:text-text transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => removeToast(id), 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast container — top-right */}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((item) => (
            <ToastRow
              key={item.id}
              item={item}
              onRemove={() => removeToast(item.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Imperative API (call from anywhere)                                */
/* ------------------------------------------------------------------ */

const imperativeToast = {
  success(_msg: string) {},
  error(_msg: string) {},
  info(_msg: string) {},
}

/**
 * Hook that returns the imperative toast helpers bound to the current provider.
 * Usage: const { toast } = useToast()
 */
export function useToast() {
  const { addToast } = useToastContext()
  const toast = useMemo(
    () => ({
      success: (msg: string) => addToast('success', msg),
      error: (msg: string) => addToast('error', msg),
      info: (msg: string) => addToast('info', msg),
    }),
    [addToast],
  )
  return { toast }
}

/** Stand-in export so `import { toast } from './Toast'` works imperatively. */
export const toast = imperativeToast
