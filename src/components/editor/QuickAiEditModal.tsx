import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiEditApi, ApiClientError } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useEditor } from './EditorContext'
import { useToast } from '../ui/Toast'

interface QuickAiEditModalProps {
  open: boolean
  onClose: () => void
  presentationId: string
}

export default function QuickAiEditModal({ open, onClose, presentationId }: QuickAiEditModalProps) {
  const { applyAiEdit } = useEditor()
  const { toast } = useToast()
  const [instruction, setInstruction] = useState('')
  const [targetIndexes, setTargetIndexes] = useState('')
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    const trimmed = instruction.trim()
    if (!trimmed) {
      toast.error('Describe the edit you want.')
      return
    }

    const parsed = targetIndexes
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n >= 0)

    const req: { instruction: string; target_indexes?: number[] } = { instruction: trimmed }
    if (parsed.length > 0) req.target_indexes = parsed

    setRunning(true)
    try {
      const res = await aiEditApi.run(presentationId, req)
      applyAiEdit(res.spec)
      toast.success(res.summary || 'AI edit applied.')
      onClose()
      setInstruction('')
      setTargetIndexes('')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'AI edit failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick AI edit">
      <div className="flex flex-col gap-4">
        <Textarea
          label="Instruction"
          placeholder="e.g. Make the third slide more visual, or switch the theme to dark"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          autoFocus
        />
        <Input
          label="Slide indexes (optional)"
          placeholder="e.g. 2, 3, 4"
          value={targetIndexes}
          onChange={(e) => setTargetIndexes(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} disabled={running} loading={running}>
            <Sparkles size={14} />
            Run
          </Button>
        </div>
      </div>
    </Modal>
  )
}
