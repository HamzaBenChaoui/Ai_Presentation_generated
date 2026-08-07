import { Outlet, Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function MarketingShell() {
  const { resolved, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-bg">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-bg px-6">
        <Link
          to="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold text-text hover:text-accent transition-colors"
        >
          SlideAI
        </Link>
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text hover:bg-surface2 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Centered content */}
      <div className="mx-auto max-w-lg px-4 py-10">
        <Outlet />
      </div>
    </div>
  )
}
