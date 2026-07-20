import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { workspacesApi, type WorkspaceMemberInfo, type AuditEntry } from '../../lib/api'

interface Props {
  workspaceId: string
  onClose: () => void
}

export default function WorkspacePanel({ workspaceId, onClose }: Props) {
  const { colors } = useTheme()
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('viewer')

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([
        workspacesApi.members(workspaceId),
        workspacesApi.audit(workspaceId),
      ])
      setMembers(m.members)
      setAudit(a.entries)
    } catch {
      setMembers([])
      setAudit([])
    } finally {
      void 0
    }
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!userId.trim()) return
    try {
      await workspacesApi.addMember(workspaceId, userId, role)
      setUserId('')
      load()
    } catch { /* silent */ }
  }

  const handleRemove = async (uid: string) => {
    try {
      await workspacesApi.removeMember(workspaceId, uid)
      load()
    } catch { /* silent */ }
  }

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>Workspace</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '16px' }}>x</button>
      </div>

      {/* Add member */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: '12px', outline: 'none' }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: '12px' }}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={handleAdd} disabled={!userId.trim()} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: userId.trim() ? 'pointer' : 'default', fontSize: '12px', fontWeight: 600 }}>Add</button>
      </div>

      {/* Members */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>Members</div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, border: `1px solid ${colors.border}`, marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: '12px', color: colors.text, fontWeight: 600 }}>{m.user_id.slice(0, 8)}...</span>
              <span style={{ fontSize: '11px', color: colors.textMuted, marginLeft: 8 }}>{m.role}</span>
            </div>
            {m.role !== 'owner' && (
              <button onClick={() => handleRemove(m.user_id)} style={{ fontSize: '11px', color: '#ff6b81', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {/* Audit */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>Activity</div>
        {audit.map(e => (
          <div key={e.id} style={{ fontSize: '11px', color: colors.textMuted, padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
            {e.action} {e.target ? `(${e.target.slice(0, 12)}...)` : ''} &middot; {formatTime(e.created_at)}
          </div>
        ))}
      </div>
    </div>
  )
}
