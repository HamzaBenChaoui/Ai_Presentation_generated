import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Presentation as PresentationIcon, History, Plus, X, Trash2, Network, Search, Loader2, Mail } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { workspacesApi, presentationsApi, ApiClientError } from '../lib/api'
import type { WorkspaceMemberInfo, AuditEntry, UserSearchResult, WorkspaceInvitation } from '../lib/api'
import type { Presentation } from '../types'

type Tab = 'members' | 'presentations' | 'audit'

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const
type Role = (typeof ROLES)[number]

const easeOut = [0.22, 1, 0.36, 1] as const

// ── Primitives (mêmes que la home) ─────────────────────────────────────────

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
      className={`group relative rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

function roleVariant(role: string): 'accent' | 'success' | 'default' {
  if (role === 'owner') return 'accent'
  if (role === 'admin') return 'success'
  return 'default'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function shortId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id
}

function initials(value: string): string {
  const clean = value.trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('members')

  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([])
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [myPresentations, setMyPresentations] = useState<Presentation[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])

  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingPresentations, setLoadingPresentations] = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(true)

  const [addingMember, setAddingMember] = useState(false)
  const [addingPresentation, setAddingPresentation] = useState(false)
  const [removingPresentationId, setRemovingPresentationId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<WorkspaceMemberInfo | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null)

  // Add member form (search by name/email)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [newRole, setNewRole] = useState<Role>('viewer')
  // Add presentation form
  const [selectedPid, setSelectedPid] = useState('')

  const isOwner =
    user !== null && members.some((m) => m.role === 'owner' && m.user_id === user.id)

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadWorkspaceName = useCallback(async () => {
    try {
      const res = await workspacesApi.list()
      const match = res.workspaces.find((w) => w.id === id)
      setWorkspaceName(match?.name ?? 'Workspace')
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }, [id, toast])

  const loadMembers = useCallback(async () => {
    if (!id) return
    try {
      setLoadingMembers(true)
      const res = await workspacesApi.members(id)
      setMembers(res.members)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoadingMembers(false)
    }
  }, [id, toast])

  const loadPresentations = useCallback(async () => {
    if (!id) return
    try {
      setLoadingPresentations(true)
      const [wsRes, myRes] = await Promise.all([
        workspacesApi.listWorkspacePresentations(id),
        presentationsApi.list(),
      ])
      setPresentations(wsRes.presentations)
      setAddedIds(new Set(wsRes.presentation_ids))
      setMyPresentations(myRes.items)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoadingPresentations(false)
    }
  }, [id, toast])

  const loadAudit = useCallback(async () => {
    if (!id) return
    try {
      setLoadingAudit(true)
      const res = await workspacesApi.audit(id)
      setAudit(res.entries)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setLoadingAudit(false)
    }
  }, [id, toast])

  const loadAdded = useCallback(async () => {
    if (!id) return
    try {
      const res = await workspacesApi.listWorkspacePresentations(id)
      setAddedIds(new Set(res.presentation_ids))
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }, [id, toast])

  const loadInvitations = useCallback(async () => {
    if (!id) return
    try {
      const res = await workspacesApi.workspaceInvitations(id)
      setInvitations(res.invitations.filter((i) => i.status === 'pending'))
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }, [id, toast])

  useEffect(() => {
    loadWorkspaceName()
    loadMembers()
    loadPresentations()
    loadAudit()
    loadAdded()
  }, [loadWorkspaceName, loadMembers, loadPresentations, loadAudit, loadAdded])

  useEffect(() => {
    if (isOwner) loadInvitations()
  }, [isOwner, loadInvitations])

  // ── User search (add member) ─────────────────────────────────────────────

  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    setSearchingUsers(true)
    const t = setTimeout(async () => {
      try {
        const res = await workspacesApi.searchUsers(query.trim())
        setResults(res.users)
        setShowResults(true)
      } catch (err) {
        if (err instanceof ApiClientError) toast.error(err.message)
      } finally {
        setSearchingUsers(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, toast])

  // ── Member handlers ────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!id) return
    const email = selectedUser?.email ?? query.trim()
    if (!email) return
    try {
      setAddingMember(true)
      await workspacesApi.inviteMember(id, email, newRole)
      setSelectedUser(null)
      setQuery('')
      setResults([])
      setNewRole('viewer')
      toast.success('Invitation sent')
      loadInvitations()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setAddingMember(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!id) return
    try {
      setCancellingInvitationId(invitationId)
      await workspacesApi.cancelInvitation(id, invitationId)
      toast.success('Invitation cancelled')
      loadInvitations()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setCancellingInvitationId(null)
    }
  }

  const handleChangeRole = async (member: WorkspaceMemberInfo, role: Role) => {
    if (!id) return
    // Prevent demoting yourself when you are the owner.
    if (member.role === 'owner') return
    if (isOwner && user && member.user_id === user.id && role !== 'owner') return
    try {
      setChangingRoleId(member.id)
      await workspacesApi.changeRole(id, member.user_id, role)
      toast.success('Role updated')
      loadMembers()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setChangingRoleId(null)
    }
  }

  const handleRemoveMember = async (member: WorkspaceMemberInfo) => {
    if (!id) return
    // Never remove the owner.
    if (member.role === 'owner') return
    setPendingRemove(member)
  }

  const confirmRemoveMember = async () => {
    if (!id || !pendingRemove) return
    try {
      setRemovingId(pendingRemove.id)
      await workspacesApi.removeMember(id, pendingRemove.user_id)
      toast.success('Member removed')
      setPendingRemove(null)
      loadMembers()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const handleDeleteWorkspace = () => {
    setPendingDelete(true)
  }

  const confirmDeleteWorkspace = async () => {
    if (!id) return
    try {
      setDeleting(true)
      await workspacesApi.delete(id)
      toast.success('Workspace deleted')
      navigate('/workspaces')
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setDeleting(false)
      setPendingDelete(false)
    }
  }

  // ── Presentation handlers ──────────────────────────────────────────────────

  const handleAddPresentation = async (pid?: string) => {
    const target = pid ?? selectedPid
    if (!id || !target) return
    try {
      setAddingPresentation(true)
      await workspacesApi.addPresentation(id, target)
      setSelectedPid('')
      toast.success('Presentation added to workspace')
      await loadPresentations()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setAddingPresentation(false)
    }
  }

  const handleRemovePresentation = async (pid: string) => {
    if (!id) return
    try {
      setRemovingPresentationId(pid)
      await workspacesApi.removePresentation(id, pid)
      toast.success('Presentation removed from workspace')
      await loadPresentations()
      loadAudit()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    } finally {
      setRemovingPresentationId(null)
    }
  }

  const availablePresentations = myPresentations.filter((p) => !addedIds.has(p.id))

  const isManager =
    user !== null &&
    members.some(
      (m) =>
        (m.role === 'owner' || m.role === 'admin') && m.user_id === user.id,
    )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col gap-6 pb-12">
      {/* Aurora background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative"
      >
        <button
          onClick={() => navigate('/workspaces')}
          className="flex items-center gap-1 text-sm text-text-dim hover:text-text transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Workspaces
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <Network size={13} />
          Workspace
        </span>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text">
            {workspaceName ?? 'Workspace'}
          </h2>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Badge variant="accent">
                You are the owner
              </Badge>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                size="sm"
                loading={deleting}
                onClick={handleDeleteWorkspace}
              >
                <Trash2 size={14} />
                Delete workspace
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="relative flex border-b border-border"
      >
        {(
          [
            { key: 'members', label: 'Members', icon: Users },
            { key: 'presentations', label: 'Presentations', icon: PresentationIcon },
            { key: 'audit', label: 'Audit', icon: History },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
              tab === t.key
                ? 'text-accent border-b border-accent'
                : 'text-text-muted hover:text-text',
            )}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
        className="relative"
      >
      {/* Members */}
      {tab === 'members' && (
        <section className="flex flex-col gap-4">
          {isOwner && (
          <SpotlightCard className="p-4 flex flex-col sm:flex-row items-end gap-3 z-30">
            <div ref={searchBoxRef} className="relative flex-1 w-full">
              <label className="text-sm font-medium text-text">Invite by name or email</label>
              <div className="relative mt-1.5">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <Input
                  placeholder="Search a user to invite…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (selectedUser) {
                      setSelectedUser(null)
                      setResults([])
                    }
                  }}
                  onFocus={() => {
                    if (query.trim() && results.length) setShowResults(true)
                  }}
                  className="h-10 rounded-xl pl-9"
                />
                {searchingUsers && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim animate-spin" />
                )}
              </div>

              {showResults && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-text-muted">No users found</p>
                  ) : (
                    results.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedUser(u)
                          setQuery(u.email)
                          setShowResults(false)
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-white">
                          {initials(u.display_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text truncate">{u.display_name}</p>
                          <p className="text-xs text-text-dim truncate">{u.email}</p>
                        </div>
                        {members.some((m) => m.user_id === u.user_id) && (
                          <Badge variant="default">Already member</Badge>
                        )}
                        {!members.some((m) => m.user_id === u.user_id) &&
                          invitations.some((i) => i.email.toLowerCase() === u.email.toLowerCase()) && (
                            <Badge variant="default">Invited</Badge>
                          )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-end gap-2 w-full sm:w-auto">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="block h-10 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ROLES.filter((r) => r !== 'owner').map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                loading={addingMember}
                disabled={!query.trim()}
                onClick={handleInvite}
              >
                <Mail size={16} />
                Send invite
              </Button>
            </div>
          </SpotlightCard>
          )}

          {isOwner && invitations.length > 0 && (
            <SpotlightCard className="p-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-text flex items-center gap-2">
                <Mail size={15} className="text-accent" />
                Pending invitations
              </p>
              <div className="flex flex-col gap-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg/50 px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-white">
                      {initials(inv.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text truncate">{inv.email}</p>
                      <p className="text-xs text-text-dim">
                        {inv.role} · invited {timeAgo(inv.created_at)}
                      </p>
                    </div>
                    <Badge variant="default">Pending</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Cancel invitation"
                      loading={cancellingInvitationId === inv.id}
                      disabled={cancellingInvitationId !== null}
                      onClick={() => handleCancelInvitation(inv.id)}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          )}

          {loadingMembers ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3">
                  <Skeleton height={36} width={36} borderRadius={999} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton height={12} width="40%" />
                    <Skeleton height={10} width="25%" />
                  </div>
                </Card>
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState icon={Users} title="No members" description="Invite members to collaborate" />
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const isSelf = user !== null && m.user_id === user.id
                const isOwnerMember = m.role === 'owner'
                const canChangeRole = !isOwnerMember && !(isOwner && isSelf)
                return (
                  <SpotlightCard key={m.id} className="flex items-center gap-3 p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-white">
                      {initials(m.display_name || m.user_id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text truncate">
                        {m.display_name || shortId(m.user_id)}
                        {isSelf && <span className="text-text-dim"> (you)</span>}
                      </p>
                      <p className="text-xs text-text-dim">
                        {m.email || shortId(m.user_id)} · Joined {timeAgo(m.created_at)}
                      </p>
                    </div>
                    <Badge variant={roleVariant(m.role)}>{m.role}</Badge>

                    {canChangeRole && (
                      <select
                        value={m.role}
                        disabled={changingRoleId === m.id}
                        onChange={(e) => handleChangeRole(m, e.target.value as Role)}
                        className="block h-8 rounded-lg border border-border bg-bg px-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} disabled={r === 'owner'}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      title={isOwnerMember ? 'Cannot remove the owner' : 'Remove member'}
                      disabled={isOwnerMember || removingId === m.id}
                      onClick={() => handleRemoveMember(m)}
                    >
                      <X size={16} />
                    </Button>
                  </SpotlightCard>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Presentations */}
      {tab === 'presentations' && (
        <section className="flex flex-col gap-4">
          {isManager && (
          <SpotlightCard className="p-4 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium text-text">Add one of your presentations</label>
              <select
                value={selectedPid}
                onChange={(e) => setSelectedPid(e.target.value)}
                className="mt-1.5 block w-full h-10 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select a presentation…</option>
                {availablePresentations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              loading={addingPresentation}
              disabled={!selectedPid}
              onClick={() => handleAddPresentation()}
            >
              <Plus size={16} />
              Add presentation
            </Button>
          </SpotlightCard>
          )}

          {loadingPresentations ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex flex-col gap-2">
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={10} width="40%" />
                </Card>
              ))}
            </div>
          ) : presentations.length === 0 ? (
            <EmptyState
              icon={PresentationIcon}
              title="No presentations"
              description="The workspace owner can add decks shared with all members"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presentations.map((p) => (
                <SpotlightCard key={p.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/editor/${p.id}`)}>
                    <p className="font-medium text-sm text-text truncate">{p.title}</p>
                    <p className="text-xs text-text-dim">
                      {p.slide_count} slides · {timeAgo(p.updated_at)}
                      {p.owner_id !== user?.id && (
                        <span className="text-accent"> · shared</span>
                      )}
                    </p>
                  </div>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Remove from workspace"
                      loading={removingPresentationId === p.id}
                      disabled={removingPresentationId !== null}
                      onClick={() => handleRemovePresentation(p.id)}
                    >
                      <X size={14} />
                      Remove
                    </Button>
                  )}
                </SpotlightCard>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Audit */}
      {tab === 'audit' && (
        <section>
          {loadingAudit ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3">
                  <Skeleton height={12} width="25%" />
                  <Skeleton height={12} width="40%" />
                </Card>
              ))}
            </div>
          ) : audit.length === 0 ? (
            <EmptyState
              icon={History}
              title="No activity yet"
              description="Actions taken on this workspace will appear here"
            />
          ) : (
            <SpotlightCard className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-text-dim">
                    <th className="px-4 py-2.5">When</th>
                    <th className="px-4 py-2.5">Actor</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{timeAgo(entry.created_at)}</td>
                      <td className="px-4 py-2.5 text-text font-mono text-xs">{shortId(entry.actor_id)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="default">{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted font-mono text-xs">
                        {entry.target ? shortId(entry.target) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SpotlightCard>
          )}
        </section>
      )}
      </motion.div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove member"
        message={
          pendingRemove
            ? `This member will be removed from the workspace and lose access to it.`
            : ''
        }
        confirmLabel="Remove"
        loading={removingId !== null}
        onConfirm={confirmRemoveMember}
        onCancel={() => setPendingRemove(null)}
      />

      <ConfirmDialog
        open={pendingDelete}
        title="Delete workspace"
        message={`"${workspaceName ?? 'This workspace'}" will be permanently deleted, including its members and activity log. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDeleteWorkspace}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  )
}
