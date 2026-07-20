import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { workspacesApi, type WorkspaceInfo } from '../../lib/api'

interface Props {
  onSelect: (workspaceId: string | null) => void
  activeId: string | null
}

export default function WorkspaceSwitcher({ onSelect, activeId }: Props) {
  const { colors } = useTheme()
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])

  useEffect(() => {
    workspacesApi.list().then(d => setWorkspaces(d.workspaces)).catch(() => setWorkspaces([]))
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: '4px 10px', borderRadius: 8, fontSize: '12px', fontWeight: 600,
          border: `1px solid ${activeId === null ? colors.accent : colors.border}`,
          background: activeId === null ? `${colors.accent}22` : 'transparent',
          color: colors.text, cursor: 'pointer',
        }}
      >
        All
      </button>
      {workspaces.map(ws => (
        <button
          key={ws.id}
          onClick={() => onSelect(ws.id)}
          style={{
            padding: '4px 10px', borderRadius: 8, fontSize: '12px', fontWeight: 600,
            border: `1px solid ${activeId === ws.id ? colors.accent : colors.border}`,
            background: activeId === ws.id ? `${colors.accent}22` : 'transparent',
            color: colors.text, cursor: 'pointer',
          }}
        >
          {ws.name}
        </button>
      ))}
    </div>
  )
}
