import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { NAV_LINKS } from '../constants/data'

export default function Navbar() {
  const { colors, mode, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        backgroundColor: colors.navBg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${colors.glow}`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '20px',
              fontWeight: '700',
              fontFamily: 'Syne, sans-serif',
              color: colors.text,
              letterSpacing: '-0.4px',
            }}
          >
            SlideAI
          </span>
          {/* Live dot */}
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: colors.accent3,
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite',
              boxShadow: `0 0 6px ${colors.glowTeal}`,
            }}
          />
        </div>

        {/* Center nav links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            justifyContent: 'center',
          }}
          className="nav-center"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveLink(link) }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                color: activeLink === link ? colors.text : colors.textMuted,
                backgroundColor: activeLink === link ? colors.surface2 : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (activeLink !== link) {
                  e.currentTarget.style.color = colors.text
                  e.currentTarget.style.backgroundColor = colors.surface
                }
              }}
              onMouseLeave={(e) => {
                if (activeLink !== link) {
                  e.currentTarget.style.color = colors.textMuted
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.borderActive
              e.currentTarget.style.color = colors.text
              e.currentTarget.style.backgroundColor = colors.surface2
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textMuted
              e.currentTarget.style.backgroundColor = colors.surface
            }}
          >
            {mode === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4" />
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  fill="none" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>

          {/* Sign in */}
          <a
            href="#"
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              color: colors.textMuted,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.text
              e.currentTarget.style.borderColor = colors.borderActive
              e.currentTarget.style.backgroundColor = colors.surface
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textMuted
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Sign in
          </a>

          {/* CTA */}
          <a
            href="#"
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              color: '#fff',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
              boxShadow: `0 4px 18px ${colors.glow}`,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = `0 8px 28px ${colors.glow}`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 4px 18px ${colors.glow}`
            }}
          >
            Get started free
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(p => !p)}
            style={{
              display: 'none',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text,
            }}
            className="hamburger-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>
                : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.navBg,
            padding: '12px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                textDecoration: 'none',
                color: colors.textMuted,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.text
                e.currentTarget.style.backgroundColor = colors.surface
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textMuted
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
