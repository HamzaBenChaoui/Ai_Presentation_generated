import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, Image as ImageIcon, Search, Loader2, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { useToast } from '../ui/Toast'
import { filesApi, assetsApi, ApiClientError } from '../../lib/api'
import type { AssetItem } from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (src: string, alt: string) => void
}

type Tab = 'upload' | 'library'

export default function ImagePickerModal({ open, onClose, onInsert }: Props) {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Library state
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState<AssetItem[]>([])
  const [loadingLib, setLoadingLib] = useState(true)

  // Reset when opened
  useEffect(() => {
    if (open) {
      setTab('upload')
      setQuery('')
      setDebounced('')
    }
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const loadLibrary = useCallback(async (q: string) => {
    try {
      setLoadingLib(true)
      const res = await assetsApi.search(q, 'image', 12)
      setItems(res.items)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoadingLib(false)
    }
  }, [toast])

  useEffect(() => {
    if (open && tab === 'library') loadLibrary(debounced)
  }, [open, tab, debounced, loadLibrary])

  // ── Upload handlers ────────────────────────────────────────────────────────

  const handleFile = async (file: File | undefined | null) => {
    if (!file || uploading) return
    try {
      setUploading(true)
      const asset = await filesApi.upload(file)
      const { url } = await filesApi.url(asset.id)
      onInsert(url, asset.filename)
      onClose()
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={onClose} title="Insert image" className="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="inline-flex rounded-lg border border-border bg-bg p-1 self-start">
          {(
            [
              { key: 'upload', label: 'Upload', icon: Upload },
              { key: 'library', label: 'Library', icon: ImageIcon },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer',
                tab === t.key
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text',
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
              dragOver ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50',
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={28} className="animate-spin text-accent" />
                <p className="text-sm text-text-muted">Uploading…</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-text-dim" />
                <p className="text-sm text-text-muted">
                  Drag &amp; drop an image here, or click to browse
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        )}

        {/* Library tab */}
        {tab === 'library' && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <Input
                className="pl-9"
                placeholder="Search images…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {loadingLib ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} height={72} borderRadius={10} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="No images found"
                description="Try a different search"
                className="py-8"
              />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        onInsert(item.url, item.attribution ?? 'Library image')
                        onClose()
                      }}
                      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-surface2 cursor-pointer"
                      title={item.attribution ?? 'Insert'}
                    >
                      <img
                        src={item.thumbnail ?? item.url}
                        alt={item.attribution ?? item.id}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X size={16} />
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
