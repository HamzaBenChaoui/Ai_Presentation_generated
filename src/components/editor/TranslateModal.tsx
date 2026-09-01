import { useState } from 'react'
import { Languages } from 'lucide-react'
import { translateApi, ApiClientError } from '../../lib/api'
import { useEditor } from './EditorContext'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

// Translate the whole deck into a target language with ONE model call and
// apply the result through the editor (history + autosave included).

const SUGGESTED = ['English', 'French', 'Arabic', 'Spanish', 'German', 'Italian', 'Portuguese', 'Dutch']

interface Props {
  presentationId: string
  open: boolean
  onClose: () => void
}

export default function TranslateModal({ presentationId, open, onClose }: Props) {
  const editor = useEditor()
  const [language, setLanguage] = useState('French')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const run = async () => {
    const target = language.trim()
    if (!target || busy) return
    setBusy(true)
    setError(null)
    try {
      const translated = await translateApi.run(presentationId, target)
      editor.applyAiEdit(translated)
      onClose()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Translation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Translate deck">
      <div className="p-5 pt-4 flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Every title, bullet, card, table cell and speaker note is translated into the
          target language. The current deck is snapshotted in version history first.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                language === lang
                  ? 'border-accent/60 bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:text-text hover:border-accent/40'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2">
          <Languages size={16} className="text-text-muted" />
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Target language"
            className="flex-1 h-9 px-3 rounded-xl border border-border bg-bg text-sm text-text outline-none focus:border-accent/60"
          />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-sm text-text-muted hover:text-text cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={busy || !language.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {busy && <Spinner size="sm" />}
            Translate
          </button>
        </div>
      </div>
    </Modal>
  )
}
