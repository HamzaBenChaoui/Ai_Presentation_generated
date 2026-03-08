import { useTheme } from '../context/ThemeContext'
import { RECENT_PRESENTATIONS } from '../constants/data'

export default function RecentPresentations() {
  const { colors } = useTheme()

  return (
    <section
      style={{
        maxWidth: '1180px',
        margin: '0 auto 88px',
        padding: '0 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: '700',
            fontFamily: 'Syne, sans-serif',
            color: colors.text,
            margin: 0,
            letterSpacing: '-0.4px',
          }}
        >
          Recent presentations
        </h2>
        <a
          href="#"
          style={{
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
            color: colors.accent,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'gap 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.accent2
            e.currentTarget.style.gap = '8px'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.accent
            e.currentTarget.style.gap = '4px'
          }}
        >
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {RECENT_PRESENTATIONS.map((item, index) => (
          <div
            key={index}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '14px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.22s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.borderColor = colors.borderActive
              e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.18)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                height: '110px',
                background: item.gradient,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative slide lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: '12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '10px 12px',
                  gap: '5px',
                }}
              >
                <div style={{ height: '3px', width: '60%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                <div style={{ height: '2px', width: '90%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                <div style={{ height: '2px', width: '75%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '14px 16px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  margin: '0 0 8px 0',
                  lineHeight: '1.35',
                }}
              >
                {item.title}
              </h3>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: colors.textMuted,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  {item.slides} slides
                </span>
                <span>{item.time}</span>
              </div>
            </div>
          </div>
        ))}

        {/* New presentation card */}
        <div
          style={{
            border: `2px dashed ${colors.border}`,
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '190px',
            cursor: 'pointer',
            transition: 'all 0.22s ease',
            backgroundColor: 'transparent',
            gap: '10px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.accent
            e.currentTarget.style.backgroundColor = `${colors.accent}08`
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: colors.surface2,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
              fontSize: '22px',
              fontWeight: '300',
              transition: 'all 0.2s ease',
            }}
          >
            +
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.textMuted,
            }}
          >
            New presentation
          </span>
        </div>
      </div>
    </section>
  )
}
