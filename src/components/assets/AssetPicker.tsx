import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { assetsApi, type AssetItem, type AssetKind } from '../../lib/api'

interface Props {
  onSelect: (asset: AssetItem) => void
}

const TABS: { kind: AssetKind; label: string }[] = [
  { kind: 'image', label: 'Images' },
  { kind: 'icon', label: 'Icons' },
]

export default function AssetPicker({ onSelect }: Props) {
  const { colors } = useTheme()
  const [activeTab, setActiveTab] = useState<AssetKind>('image')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await assetsApi.search(query, activeTab, 12)
      setItems(result.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [query, activeTab])

  useEffect(() => {
    doSearch()
  }, [doSearch])

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 70,
        width: 380,
        maxHeight: 440,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* Tabs + search */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {TABS.map(tab => (
            <button
              key={tab.kind}
              onClick={() => setActiveTab(tab.kind)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: `1px solid ${activeTab === tab.kind ? colors.accent : colors.border}`,
                background: activeTab === tab.kind ? `${colors.accent}22` : 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets..."
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: colors.surface2,
            color: colors.text,
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          alignItems: 'start',
        }}
      >
        {loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: colors.textMuted, fontSize: '12px', padding: 20 }}>
            Loading...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: colors.textMuted, fontSize: '12px', padding: 20 }}>
            No results.
          </div>
        )}
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            style={{
              padding: 0,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              background: 'transparent',
              cursor: 'pointer',
              overflow: 'hidden',
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={item.id}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.id}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            ) : (
              <span style={{ fontSize: '10px', color: colors.textMuted }}>{item.kind}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
