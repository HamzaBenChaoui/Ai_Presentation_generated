import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cable, Check, Copy, Eye, EyeOff, KeyRound, Link2, RefreshCw, ShieldAlert, Sparkles,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { authApi, getAccessToken, ApiClientError } from '../lib/api'
import { cn } from '../lib/cn'

const easeOut = [0.22, 1, 0.36, 1] as const

// ── Tool catalog (mirrors the backend MCP registry) ─────────────────────────

const MCP_TOOLS: { name: string; description: string }[] = [
  { name: 'list_presentations', description: 'List your presentations with ids' },
  { name: 'get_presentation', description: 'Inspect the full structured spec of a deck' },
  { name: 'get_slide_elements', description: 'Read every element of a slide with its index' },
  { name: 'create_presentation', description: 'Create a new empty presentation' },
  { name: 'generate_presentation', description: 'Generate a full deck from a topic with Slide AI' },
  { name: 'ai_edit_presentation', description: 'Natural-language edit of an existing deck' },
  { name: 'update_slide', description: 'Rewrite a slide (title, layout, elements...)' },
  { name: 'add_slide', description: 'Insert a slide at any position' },
  { name: 'delete_slide / move_slide', description: 'Reorganize the deck' },
  { name: 'update_element', description: 'Patch one element: text, position x/y, animation...' },
  { name: 'move_element', description: 'Reorder an element (stacking / reading order)' },
  { name: 'add_element / remove_element', description: 'Fine-grained content edits' },
  { name: 'change_theme / rewrite_titles', description: 'Restyle the whole deck' },
  { name: 'define_custom_animation', description: 'Author CSS keyframe animations (any property)' },
  { name: 'set_element_animation', description: 'Apply animations to any element' },
  { name: 'update_custom_slide', description: 'Write full HTML/CSS/JS showpiece slides' },
  { name: 'get_slide_detail', description: 'Read one slide before editing it' },
  { name: 'delete_presentation', description: 'Remove a deck (destructive)' },
]

// ── Per-client setup snippets ───────────────────────────────────────────────

type ClientKey = 'zkr' | 'claude-code' | 'cursor' | 'opencode' | 'codex' | 'zcode'

interface ClientSetup {
  key: ClientKey
  label: string
  file: string
  cli?: { label: string; command: string }
  config: string
  format: 'json' | 'toml'
  notes?: string[]
}

function buildSetups(url: string, token: string): Record<ClientKey, ClientSetup> {
  return {
    // ZKR first — same protocol/config as Claude Code, the CLI just starts
    // with `zkr` instead of `claude`.
    zkr: {
      key: 'zkr',
      label: 'ZKR',
      file: '.mcp.json  (racine du projet)',
      cli: {
        label: 'Ou en une commande :',
        command: `zkr mcp add --transport http slide-ai ${url} --header "Authorization: Bearer ${token}"`,
      },
      format: 'json',
      config: JSON.stringify(
        {
          mcpServers: {
            'slide-ai': { type: 'http', url, headers: { Authorization: `Bearer ${token}` } },
          },
        },
        null,
        2,
      ),
    },
    'claude-code': {
      key: 'claude-code',
      label: 'Claude Code',
      file: '.mcp.json  (project root)  ou  ~/.claude.json',
      cli: {
        label: 'Ou en une commande :',
        command: `claude mcp add --transport http slide-ai ${url} --header "Authorization: Bearer ${token}"`,
      },
      format: 'json',
      config: JSON.stringify(
        {
          mcpServers: {
            'slide-ai': { type: 'http', url, headers: { Authorization: `Bearer ${token}` } },
          },
        },
        null,
        2,
      ),
    },
    cursor: {
      key: 'cursor',
      label: 'Cursor',
      file: '.cursor/mcp.json  (projet)  —  ou via Cursor Settings → MCP → Add server',
      format: 'json',
      config: JSON.stringify(
        {
          mcpServers: {
            'slide-ai': { url, headers: { Authorization: `Bearer ${token}` } },
          },
        },
        null,
        2,
      ),
      notes: ['Après avoir sauvegardé, ouvre Cursor Settings → MCP → clique "Refresh" pour voir les outils.'],
    },
    opencode: {
      key: 'opencode',
      label: 'OpenCode',
      file: 'opencode.json  (projet ou ~/.config/opencode)',
      format: 'json',
      config: JSON.stringify(
        {
          $schema: 'https://opencode.ai/config.json',
          mcp: {
            'slide-ai': { type: 'remote', url, headers: { Authorization: `Bearer ${token}` }, enabled: true },
          },
        },
        null,
        2,
      ),
    },
    codex: {
      key: 'codex',
      label: 'Codex',
      file: '~/.codex/config.toml',
      format: 'toml',
      config: `[mcp_servers.slide-ai]
url = "${url}"
bearer_token_env_var = "SLIDE_AI_TOKEN"`,
      notes: [
        'Exporte le token avant de lancer Codex :  export SLIDE_AI_TOKEN="' + token + '"',
        'La connexion HTTP streamable nécessite une version récente de Codex CLI.',
      ],
    },
    zcode: {
      key: 'zcode',
      label: 'ZCode',
      file: '.mcp.json  (racine du projet)',
      cli: {
        label: 'Ou en une commande :',
        command: `zcode mcp add slide-ai --transport http ${url} --header "Authorization: Bearer ${token}"`,
      },
      format: 'json',
      config: JSON.stringify(
        {
          mcpServers: {
            'slide-ai': { type: 'http', url, headers: { Authorization: `Bearer ${token}` } },
          },
        },
        null,
        2,
      ),
    },
  }
}

// ── Small building blocks ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch { /* clipboard unavailable */ }
      }}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-border bg-surface2/80 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
        copied ? 'text-emerald-400 border-emerald-500/30' : 'text-text-dim hover:text-text hover:border-accent/40',
      )}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  )
}

function Snippet({ code, fileName, format }: { code: string; fileName?: string; format: 'json' | 'toml' | 'bash' }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-bg/40">
        <span className="text-xs font-medium text-text-dim truncate">
          {fileName ?? (format === 'bash' ? 'Terminal' : 'Config')}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className={cn(
        'px-3 py-2.5 text-[12px] leading-relaxed overflow-x-auto text-text',
        format === 'bash' && 'text-emerald-300/90',
      )}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function McpPage() {
  const storedToken = getAccessToken() ?? ''
  const [baseUrl, setBaseUrl] = useState(
    () => `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'}/api/v1/mcp`,
  )
  const [showToken, setShowToken] = useState(false)
  const [token, setToken] = useState(storedToken)
  const [tab, setTab] = useState<ClientKey>('zkr')
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  /** Mint a dedicated 72h MCP token so agents don't die with the 1h session. */
  const mintMcpToken = async () => {
    setMinting(true)
    setMintError(null)
    try {
      const res = await authApi.mcpToken()
      setToken(res.access_token)
      setShowToken(true)
      setExpiresAt(
        new Date(Date.now() + res.expires_in * 1000).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      )
    } catch (err) {
      setMintError(err instanceof ApiClientError ? err.message : 'Token generation failed')
    } finally {
      setMinting(false)
    }
  }

  const setups = useMemo(() => buildSetups(baseUrl.trim(), token.trim() || '<VOTRE_TOKEN>'), [baseUrl, token])
  const active = setups[tab]

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
          <Cable size={13} />
          Model Context Protocol
        </span>
        <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text">
          Connecte tes outils IA à Slide AI
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Slide AI expose un serveur MCP : ZKR, Claude Code, Cursor, OpenCode, Codex,
          ZCode et autres agents compatibles peuvent lister, créer, générer et modifier tes présentations
          directement depuis leur chat — comme s&apos;ils avaient des mains dans l&apos;app.
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
        className="relative"
      >
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
              <Sparkles size={17} />
            </div>
            <div className="space-y-2">
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-text">
                Ce que l&apos;agent peut faire
              </h3>
              <p className="text-sm text-text-muted max-w-2xl">
                Une fois connecté, demande simplement par exemple :
                <em> « crée une présentation sur l&apos;IA dans la santé »</em>,
                <em> « ajoute un slide pricing à la deck X »</em> ou
                <em> « ajoute une animation de glow sur le titre du slide 1 »</em>.
                L&apos;agent appelle les outils MCP suivants :
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 max-w-3xl">
                {MCP_TOOLS.map((t) => (
                  <span
                    key={t.name}
                    title={t.description}
                    className="inline-flex items-center rounded-lg border border-border bg-bg/40 px-2 py-1 text-[11px] font-medium text-text-dim cursor-help hover:border-accent/40 hover:text-text transition-colors"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Setup builder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="relative"
      >
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
              <Link2 size={17} />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-text">
                Configuration en 2 minutes
              </h3>
              <p className="text-xs text-text-dim">
                Vérifie l&apos;URL du serveur et ton token, puis copie le bloc de ton application.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <Input
                label="URL du serveur MCP"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://ton-domaine.com/api/v1/mcp"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text">Token MCP (72h)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Colle ton access token"
                    className="block w-full h-10 rounded-xl border border-border bg-bg pl-9 pr-9 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text cursor-pointer"
                    title={showToken ? 'Masquer' : 'Afficher'}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={mintMcpToken}
                  disabled={minting}
                  className="flex shrink-0 items-center gap-1.5 h-10 px-3 rounded-xl border border-accent/40 bg-accent/10 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-50"
                  title="Génère un token dédié valable 72 heures pour tes outils MCP"
                >
                  {minting ? <Spinner size="sm" /> : <RefreshCw size={13} />}
                  Token 72h
                </button>
              </div>
              <p className="mt-1.5 text-xs text-text-dim">
                {mintError
                  ? <span className="text-red-400">{mintError}</span>
                  : expiresAt
                    ? `Token dédié MCP généré — valable jusqu'au ${expiresAt}. Colle-le dans la config de ton outil.`
                    : storedToken
                      ? 'Pré-rempli avec le token de ta session (expire ~1h). Clique sur « Token 72h » pour générer un token dédié longue durée.'
                      : 'Clique sur « Token 72h » pour générer un token dédié pour tes outils MCP.'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {(Object.keys(setups) as ClientKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                  tab === key
                    ? 'border-accent/50 bg-gradient-to-br from-accent/15 to-accent2/10 text-accent'
                    : 'border-border text-text-dim hover:text-text hover:bg-surface2',
                )}
              >
                {setups[key].label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3 max-w-3xl">
            <p className="text-xs text-text-muted">
              Ajoute ce serveur dans <span className="font-semibold text-text">{active.file}</span> :
            </p>
            <Snippet code={active.config} fileName={active.file} format={active.format} />
            {active.cli && (
              <>
                <p className="text-xs text-text-muted pt-1">{active.cli.label}</p>
                <Snippet code={active.cli.command} format="bash" />
              </>
            )}
            {active.notes?.map((n) => (
              <p key={n} className="text-xs text-text-dim">• {n}</p>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Security notes */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: easeOut }}
        className="relative"
      >
        <Card className="p-5 sm:p-6 border-amber-500/25">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25">
              <ShieldAlert size={17} />
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-text">
                Bon à savoir
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-text-muted marker:text-amber-400/60">
                <li>
                  Le token agit <span className="text-text font-medium">en ton nom</span> : l&apos;agent ne voit et
                  ne modifie que les présentations auxquelles tu as accès (votre rôle viewer reste en lecture seule).
                </li>
                <li>
                  Utilise le <span className="text-text font-medium">bouton « Token 72h »</span> ci-dessus :
                  il génère un token dédié valable 72 h (au lieu de ~1 h pour la session web).
                  Régénère-le simplement à l&apos;expiration.
                </li>
                <li>
                  Ne committe jamais ton token : garde la config avec le token dans un fichier
                  local non versionné (ou utilise une variable d&apos;environnement).
                </li>
                <li>
                  En dev local, l&apos;URL par défaut passe par le proxy Vite
                  (<code className="text-xs">http://localhost:5173/api/v1/mcp</code>) ; l&apos;API tourne sur le port 8000.
                </li>
              </ul>
              <div className="pt-1">
                <Badge variant="default">Transport : MCP Streamable HTTP (stateless)</Badge>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
