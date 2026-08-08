import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Presentation,
  Image,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../context/AuthContext'

const SIDEBAR_KEY = 'slideai.sidebar'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: Presentation },
  { to: '/assets', label: 'Assets', icon: Image },
  { to: '/workspaces', label: 'Workspaces', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed))
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-surface transition-all duration-200',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-border px-4',
            collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white shadow-sm shadow-accent/30">
            <Sparkles size={15} />
          </span>
          {!collapsed && (
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text truncate">
              SlideAI
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:bg-surface2 hover:text-text',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && (
                <span
                  className={cn(
                    'ml-auto h-1.5 w-1.5 rounded-full transition-opacity',
                    item.to === '/dashboard'
                      ? 'opacity-0 group-hover:opacity-60 bg-accent'
                      : 'opacity-0',
                  )}
                />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={handleSignOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted hover:bg-surface2 hover:text-text transition-colors cursor-pointer',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign out</span>}
          </button>
          {!collapsed && user && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {user.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span className="truncate text-xs text-text-muted">{user.email}</span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex absolute top-20 -right-3 z-10 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:bg-surface2 transition-colors cursor-pointer"
          style={{ display: 'none' }}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col lg:hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text hover:bg-surface2 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white shadow-sm shadow-accent/30">
              <Sparkles size={15} />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
              SlideAI
            </span>
          </div>
        </header>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex w-60 flex-col bg-surface border-r border-border">
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white shadow-sm shadow-accent/30">
                    <Sparkles size={15} />
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                    SlideAI
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface2 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-muted hover:bg-surface2 hover:text-text',
                      )
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-border p-2">
                {user && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                      {user.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <span className="truncate text-sm text-text-muted">{user.email}</span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface2 hover:text-text transition-colors cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Sign out</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Mobile main content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>

      {/* Desktop main content */}
      <main className="hidden lg:flex flex-1 overflow-y-auto">
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
