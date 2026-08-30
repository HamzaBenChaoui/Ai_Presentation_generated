import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Trash2, User as UserIcon, SlidersHorizontal, AlertTriangle, Settings as SettingsIcon, Cpu } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { getSettings, updateSettings, clearSettings, DEFAULT_SETTINGS, type AppSettings } from '../lib/settings'
import { useBrandKit } from '../context/BrandKitContext'
import { filesApi, ApiClientError } from '../lib/api'
import { clearTokens } from '../lib/api'
import ModelSelect from '../components/ai/ModelSelect'

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
  const navigate = useNavigate()
  const { toast } = useToast()

  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const { brand, save: saveBrand } = useBrandKit()
  const [brandDraft, setBrandDraft] = useState(() => ({
    color_primary: '',
    color_secondary: '',
    font_heading: '',
    font_body: '',
  }))
  const [brandSaving, setBrandSaving] = useState(false)

  const brandValue = (key: keyof typeof brandDraft): string =>
    (brandDraft[key] as string) || ((brand?.[key] as string | null | undefined) ?? '')

  const saveBrandKit = async () => {
    setBrandSaving(true)
    try {
      const patch: Record<string, string> = {}
      for (const key of ['color_primary', 'color_secondary', 'font_heading', 'font_body'] as const) {
        const v = brandDraft[key].trim()
        if (v) patch[key] = v
      }
      await saveBrand(patch)
      setBrandDraft({ color_primary: '', color_secondary: '', font_heading: '', font_body: '' })
      toast.success('Brand kit saved — applied to every deck render.')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not save brand kit')
    } finally {
      setBrandSaving(false)
    }
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    try {
      const asset = await filesApi.upload(file)
      const { url } = await filesApi.url(asset.id)
      await saveBrand({ logo_url: url })
      toast.success('Logo saved.')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Logo upload failed')
    }
  }
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

      {/* ── Slide AI model ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="p-5 sm:p-6">
        <SectionTitle
          icon={Cpu}
          title="Slide AI model"
          description="Which model generates and edits your presentations"
        />
        <div className="max-w-lg">
          <ModelSelect
            value={settings.aiModel}
            onChange={(model) => persist({ aiModel: model })}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="default">Applies to generation, Quick AI edit and the editor AI chat</Badge>
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

      {/* ── Brand kit ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: easeOut }}
        className="relative"
      >
      <SpotlightCard className="p-5 sm:p-6">
        <SectionTitle
          icon={Cpu}
          title="Brand kit"
          description="Your logo and colors applied to every deck render"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-sm font-medium text-text">Primary color</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(brandValue('color_primary')) ? brandValue('color_primary') : '#ea580c'}
                onChange={(e) => setBrandDraft((d) => ({ ...d, color_primary: e.target.value }))}
                className="h-10 w-14 rounded-lg border border-border bg-bg cursor-pointer"
              />
              <Input
                value={brandValue('color_primary')}
                onChange={(e) => setBrandDraft((d) => ({ ...d, color_primary: e.target.value }))}
                placeholder="#ea580c"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text">Secondary color</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(brandValue('color_secondary')) ? brandValue('color_secondary') : '#f59e0b'}
                onChange={(e) => setBrandDraft((d) => ({ ...d, color_secondary: e.target.value }))}
                className="h-10 w-14 rounded-lg border border-border bg-bg cursor-pointer"
              />
              <Input
                value={brandValue('color_secondary')}
                onChange={(e) => setBrandDraft((d) => ({ ...d, color_secondary: e.target.value }))}
                placeholder="#f59e0b"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text">Heading font</label>
            <Input
              value={brandValue('font_heading')}
              onChange={(e) => setBrandDraft((d) => ({ ...d, font_heading: e.target.value }))}
              placeholder="e.g. 'Syne', sans-serif"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text">Body font</label>
            <Input
              value={brandValue('font_body')}
              onChange={(e) => setBrandDraft((d) => ({ ...d, font_body: e.target.value }))}
              placeholder="e.g. 'DM Sans', sans-serif"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text">Logo</label>
            <div className="mt-1.5 flex items-center gap-2">
              {brand?.logo_url && (
                <img src={brand.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-border bg-bg" />
              )}
              <label className="flex-1 h-10 grid place-items-center rounded-xl border border-dashed border-border text-xs text-text-dim hover:border-accent/40 hover:text-accent transition-colors cursor-pointer">
                Upload logo (PNG/SVG)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    uploadLogo(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex items-end">
            <Button variant="primary" loading={brandSaving} onClick={saveBrandKit}>
              Save brand kit
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Badge variant="default">Brand colors and fonts override every theme, for you only</Badge>
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
