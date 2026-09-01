import { useState } from 'react'
import { themeNames, themeLabels, type ThemeName } from './theme'
import { useDeckTheme } from './DeckThemeContext'
import { themesApi } from '../../lib/api'

// Live deck-theme switcher. Lists all 15 design-system themes; selecting one
// re-skins the entire deck instantly via the DeckThemeContext. The current
// look can also be saved as a reusable personal theme.
export default function ThemeSwitcher() {
  const { theme, setTheme, tokens } = useDeckTheme()
  const [open, setOpen] = useState(false)
  const [savingName, setSavingName] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)

  const label = themeLabels[theme] ?? (String(theme).startsWith('u_') ? 'My theme' : String(theme))

  const saveAsMyTheme = async () => {
    const name = (savingName ?? '').trim()
    if (!name || saveBusy) return
    setSaveBusy(true)
    try {
      await themesApi.create(name, tokens as unknown as Record<string, any>)
      setSavingName(null)
      setOpen(false)
    } catch {
      /* the picker shows the saved list; a failure here is non-fatal */
    } finally {
      setSaveBusy(false)
    }
  }

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
        {label}
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

          {open && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                marginTop: 8, paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {savingName === null ? (
                <button
                  onClick={() => setSavingName('')}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: '10px',
                    cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.25)',
                    background: 'transparent', color: '#c9c4ff', fontSize: '12px', fontWeight: 600,
                  }}
                  title="Save the current look as a reusable personal theme"
                >
                  ＋ Save current look as my theme
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveAsMyTheme()
                      if (e.key === 'Escape') setSavingName(null)
                    }}
                    placeholder="Theme name"
                    style={{
                      flex: 1, minWidth: 0, height: 30, padding: '0 10px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.35)',
                      color: '#f4f4ff', fontSize: 12, outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => void saveAsMyTheme()}
                    disabled={saveBusy || !savingName.trim()}
                    style={{
                      height: 30, padding: '0 10px', borderRadius: 8, cursor: 'pointer',
                      border: 'none', background: '#7c6aff', color: '#fff',
                      fontSize: 12, fontWeight: 700, opacity: saveBusy || !savingName.trim() ? 0.5 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}
    </div>
  )
}
