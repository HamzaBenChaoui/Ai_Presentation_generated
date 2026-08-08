import { Outlet, Link } from 'react-router-dom'

export default function MarketingShell() {
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
      </header>

      {/* Centered content */}
      <div className="mx-auto max-w-lg px-4 py-10">
        <Outlet />
      </div>
    </div>
  )
}
