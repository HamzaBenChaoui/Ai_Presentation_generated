import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { specApi, ApiClientError } from '../lib/api'
import type { PresentationSpec } from '../types'
import FullscreenPlayer from '../components/renderer/FullscreenPlayer'
import { DeckThemeProvider } from '../components/renderer/DeckThemeContext'
import type { ThemeName } from '../components/renderer/theme'
import { Spinner } from '../components/ui/Spinner'

export default function PresentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    specApi
      .get(id)
      .then(setSpec)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  const handleExit = () => navigate(`/editor/${id}`)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !spec) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full bg-bg">
        <p className="text-text-muted">{error || 'Presentation not found'}</p>
        <button onClick={handleExit} className="rounded-lg bg-surface px-4 py-2 text-sm text-text hover:bg-surface2 transition-colors cursor-pointer">
          ← Back to Editor
        </button>
      </div>
    )
  }

  return (
    <DeckThemeProvider initial={spec.meta?.theme as ThemeName | null}>
      <FullscreenPlayer spec={spec} onExit={handleExit} />
    </DeckThemeProvider>
  )
}
