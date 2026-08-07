import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="flex items-start gap-4">
        <div
          className={
            variant === 'destructive'
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent'
          }
        >
          <AlertTriangle size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm text-text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
