import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, ArrowRight, Trash2, Network, Mail, Check, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { workspacesApi, ApiClientError } from '../lib/api'
import type { WorkspaceInfo, PendingInvitation } from '../lib/api'

// ── Primitives (mêmes que la home) ─────────────────────────────────────────

const easeOut = [0.22, 1, 0.36, 1] as const

function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: easeOut },
  }),
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Avatars déterministes (initials + couleur) ─────────────────────────────

const AVATAR_GRADIENTS = [
  'from-accent to-accent2',
  'from-purple-500 to-accent',
  'from-yellow-500 to-accent2',
  'from-red-500 to-accent',
]

function WorkspaceAvatar({ name, i }: { name: string; i: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} font-[family-name:var(--font-display)] text-sm font-bold text-white shadow-md`}
    >
      {initials || 'WS'}
    </div>
  )
}

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<WorkspaceInfo | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await workspacesApi.list()
      setWorkspaces(res.workspaces)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadInvitations = useCallback(async () => {
    try {
      const res = await workspacesApi.pendingInvitations()
      setInvitations(res.invitations)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }, [toast])

  useEffect(() => {
    load()
    loadInvitations()
  }, [load, loadInvitations])

  const handleRespond = async (invitationId: string, accept: boolean) => {
    try {
      setRespondingId(invitationId)
      if (accept) {
        await workspacesApi.acceptInvitation(invitationId)
        toast.success('Invitation accepted')
      } else {
        await workspacesApi.declineInvitation(invitationId)
        toast.success('Invitation declined')
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      load()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      setCreating(true)
      const created = await workspacesApi.create(trimmed)
      setCreateOpen(false)
      setName('')
      toast.success('Workspace created')
      navigate(`/workspaces/${created.id}`)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      setDeletingId(pendingDelete.id)
      await workspacesApi.delete(pendingDelete.id)
      toast.success('Workspace deleted')
      setWorkspaces((prev) => prev.filter((w) => w.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="relative flex flex-col gap-8 pb-12">
      {/* Aurora background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Network size={13} />
            Workspaces
          </span>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-bold text-text">
            Organize your{' '}
            <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
              team
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Share presentations, manage members, and track every action.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
          className="shrink-0"
        >
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateOpen(true)}
            className="group"
          >
            <Plus size={16} />
            Create workspace
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </motion.section>

      {/* Invitations */}
      {invitations.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: easeOut }}
          className="relative flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-accent" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text">
              Invitations
            </h2>
            <Badge variant="accent">{invitations.length}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <SpotlightCard key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-sm font-bold text-white">
                  {inv.workspace_name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'WS'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{inv.workspace_name}</p>
                  <p className="text-xs text-text-dim">
                    Invited as <span className="text-accent">{inv.role}</span> · {formatDate(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={respondingId === inv.id}
                    disabled={respondingId !== null}
                    onClick={() => handleRespond(inv.id, true)}
                  >
                    <Check size={15} />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={respondingId !== null}
                    onClick={() => handleRespond(inv.id, false)}
                  >
                    <X size={15} />
                    Decline
                  </Button>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </motion.section>
      )}

      {/* Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15, ease: easeOut }}
        className="relative"
      >
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col gap-3">
                <Skeleton height={18} width="60%" />
                <Skeleton height={12} width="40%" />
              </Card>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No workspaces yet"
            description="Create a workspace to share presentations and track activity"
            action={
              <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Create workspace
              </Button>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {workspaces.map((ws, i) => (
                <motion.div
                  key={ws.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: easeOut }}>
                    <SpotlightCard className="cursor-pointer h-full flex flex-col gap-4 p-5">
                      <div
                        className="flex items-start justify-between gap-2"
                        onClick={() => navigate(`/workspaces/${ws.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <WorkspaceAvatar name={ws.name} i={i} />
                          <div className="min-w-0">
                            <p className="font-[family-name:var(--font-display)] text-base font-semibold text-text truncate">
                              {ws.name}
                            </p>
                            <p className="text-xs text-text-dim">
                              Created {formatDate(ws.created_at)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-text-dim group-hover:text-accent transition-colors shrink-0 mt-1"
                        />
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                        <Badge variant="default">Workspace</Badge>
                        {ws.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Delete workspace"
                            disabled={deletingId === ws.id}
                            loading={deletingId === ws.id}
                            onClick={() => setPendingDelete(ws)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </SpotlightCard>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create workspace"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            placeholder="e.g. Product Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            autoFocus
            className="h-11 rounded-xl"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              disabled={!name.trim()}
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete workspace"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently deleted, including its members and activity log. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
