import { useState } from 'react'
import { themeNames, themeLabels, type ThemeName } from './theme'
import { useDeckTheme } from './DeckThemeContext'

// Live deck-theme switcher. Lists all 15 design-system themes; selecting one
// re-skins the entire deck instantly via the DeckThemeContext.
export default function ThemeSwitcher() {
  const { theme, setTheme } = useDeckTheme()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.06)', color: '#f4f4ff', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
        title="Change deck theme"
      >
        <span style={{ fontSize: '15px' }}>🎨</span>
        {themeLabels[theme]}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
            width: '240px', maxHeight: '320px', overflow: 'auto',
            background: '#12121f', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px', padding: '8px', display: 'grid', gap: '4px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          {themeNames.map((name: ThemeName) => {
            const active = name === theme
            return (
              <button
                key={name}
                onClick={(e) => {
                  e.stopPropagation()
                  setTheme(name)
                  setOpen(false)
                }}
                style={{
                  textAlign: 'left', padding: '9px 12px', borderRadius: '10px', cursor: 'pointer',
                  border: active ? '1px solid #7c6aff' : '1px solid transparent',
                  background: active ? 'rgba(124,106,255,0.16)' : 'transparent',
                  color: '#f4f4ff', fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{themeLabels[name]}</span>
                <span
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background:
                      name === 'minimal' || name === 'microsoft' || name === 'google' || name === 'apple'
                        ? 'conic-gradient(#0078d4,#ea4335,#fbbc05,#34a853)'
                        : 'linear-gradient(135deg,#7c6aff,#ff6ac1)',
                  }}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
