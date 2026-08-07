import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Trash2, User as UserIcon, Palette, SlidersHorizontal, AlertTriangle, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { useTheme, type ThemeMode } from '../context/ThemeContext'
import { getSettings, updateSettings, clearSettings, DEFAULT_SETTINGS, type AppSettings } from '../lib/settings'
import { clearTokens } from '../lib/api'

const easeOut = [0.22, 1, 0.36, 1] as const

function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof UserIcon; title: string; description: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
        <Icon size={17} />
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-text">{title}</h3>
        <p className="text-xs text-text-dim">{description}</p>
      </div>
    </div>
  )
}

function initials(name: string, email: string): string {
  const source = name.trim() || email.trim() || 'U'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function SettingsPage() {
  const { user, signOut, updateDisplayName } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [displayName, setDisplayName] = useState<string>(
    user?.display_name ?? '',
  )
  const [savingName, setSavingName] = useState(false)
  const [nameDirty, setNameDirty] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name)
      setNameDirty(false)
    }
  }, [user?.display_name])

  const persist = (patch: Partial<AppSettings>) => {
    const next = updateSettings(patch)
    setSettings(next)
  }

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value)
    setNameDirty(true)
  }

  const saveDisplayName = async () => {
    const name = displayName.trim()
    if (!name) return
    setSavingName(true)
    try {
      await updateDisplayName(name)
      setNameDirty(false)
      toast.success('Display name saved to your account.')
    } catch {
      toast.error('Failed to save display name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      navigate('/login')
    }
  }

  const handleClearLocalData = () => {
    clearSettings()
    clearTokens()
    toast.success('Local data cleared')
    window.location.reload()
  }

  const themeModes: { key: ThemeMode; label: string }[] = [
    { key: 'dark', label: 'Dark' },
    { key: 'light', label: 'Light' },
    { key: 'system', label: 'System' },
  ]

  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="relative flex flex-col gap-6 pb-12">
      {/* Aurora background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute top-48 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <SettingsIcon size={13} />
          Preferences
        </span>
        <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text">
          Settings
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Manage your profile, appearance, and editor preferences.
        </p>
      </motion.div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="p-5 sm:p-6">
        <SectionTitle
          icon={UserIcon}
          title="Profile"
          description="Your account details"
        />
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xl font-bold text-white shadow-lg shadow-accent/20">
            {user ? initials(user.display_name, user.email) : 'U'}
          </div>
          <div className="flex flex-col gap-3 flex-1 w-full max-w-md">
            <div>
              <p className="text-xs font-medium text-text-muted mb-1">Email</p>
              <p className="text-sm text-text">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted mb-1">
                Display name
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveDisplayName}
                  disabled={!nameDirty || !displayName.trim()}
                  loading={savingName}
                >
                  Save
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted mb-1">Account created</p>
              <p className="text-sm text-text">{createdDate}</p>
            </div>
            <div className="pt-2">
              <Button variant="outline" loading={signingOut} onClick={handleSignOut}>
                <LogOut size={16} />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </SpotlightCard>
      </motion.div>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="p-5 sm:p-6">
        <SectionTitle
          icon={Palette}
          title="Appearance"
          description="Theme mode for the whole app"
        />
        <div className="inline-flex rounded-xl border border-border bg-bg p-1">
          {themeModes.map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer',
                mode === t.key
                  ? 'bg-gradient-to-br from-accent to-accent2 text-white shadow-md shadow-accent/25'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </SpotlightCard>
      </motion.div>

      {/* ── Editor preferences ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="p-5 sm:p-6">
        <SectionTitle
          icon={SlidersHorizontal}
          title="Editor preferences"
          description="Defaults for new presentations"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <Input
              label="Default slide count"
              type="number"
              min={1}
              max={30}
              value={settings.defaultSlideCount}
              onChange={(e) =>
                persist({ defaultSlideCount: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Input
              label="Default tone"
              value={settings.defaultTone}
              onChange={(e) => persist({ defaultTone: e.target.value })}
            />
          </div>
          <div>
            <Input
              label="Default language"
              value={settings.defaultLanguage}
              onChange={(e) => persist({ defaultLanguage: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text">Autosave delay</label>
            <select
              value={settings.autosaveDelay}
              onChange={(e) => persist({ autosaveDelay: Number(e.target.value) })}
              className="mt-1.5 block w-full h-10 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={1}>1 second</option>
              <option value={3}>3 seconds</option>
              <option value={5}>5 seconds</option>
            </select>
          </div>
          {/* Animations toggle — accessibility / PDF export / preference */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <label className="text-sm font-medium text-text">Animations</label>
              <p className="text-xs text-text-dim mt-0.5">
                Element entrances and slide transitions. Disable for accessibility,
                low-power devices, or PDF export.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.animationsEnabled}
              onClick={() => persist({ animationsEnabled: !settings.animationsEnabled })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                settings.animationsEnabled ? 'bg-accent' : 'bg-surface2 border border-border'
              }`}
              title={settings.animationsEnabled ? 'Animations on' : 'Animations off'}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                  settings.animationsEnabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="default">Defaults apply to the Dashboard generation bar</Badge>
          <button
            className="text-xs text-accent hover:underline cursor-pointer"
            onClick={() => persist({ ...DEFAULT_SETTINGS })}
          >
            reset editor preferences
          </button>
        </div>
      </SpotlightCard>
      </motion.div>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="border-danger/40 p-5 sm:p-6">
        <SectionTitle
          icon={AlertTriangle}
          title="Danger zone"
          description="Destructive actions"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-text-muted">
            Remove all locally saved settings and sign you out.
          </p>
          <Button variant="destructive" onClick={() => setClearOpen(true)}>
            <Trash2 size={16} />
            Clear local data
          </Button>
        </div>
      </SpotlightCard>
      </motion.div>

      <ConfirmDialog
        open={clearOpen}
        title="Clear local data"
        message="All locally saved settings will be removed and you will be signed out."
        confirmLabel="Clear"
        onConfirm={handleClearLocalData}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  )
}
