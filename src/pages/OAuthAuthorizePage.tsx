import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { request, ApiClientError } from '../lib/api'

/**
 * Consent page for CLI/MCP authentication:
 * - ?user_code=XXXX-XXXX  → device-flow pairing (ZKR / Claude Code / ...)
 * - ?auth_id=...          → OAuth authorization consent (auto-auth clients)
 *
 * Requires the web session: the CLI gets a 30-day token without any
 * manual copy-paste.
 */
export default function OAuthAuthorizePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const userCode = params.get('user_code')
  const authId = params.get('auth_id')
  const clientName = params.get('client_name') || 'your CLI'

  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!userCode && !authId) {
      setStatus('error')
      setMessage('Missing authorization parameters — reopen the link from your CLI.')
    }
  }, [userCode, authId])

  const approve = async () => {
    setStatus('working')
    setMessage('')
    try {
      if (userCode) {
        await request<{ status: string }>('POST', '/auth/device/authorize', { user_code: userCode })
        setStatus('done')
        setMessage('Your CLI is connected for 30 days — you can close this page.')
      } else if (authId) {
        const res = await request<{ redirect: string }>('POST', '/oauth/authorize/approve', { auth_id: authId })
        setStatus('done')
        setMessage('Authorized! Redirecting back to your CLI…')
        setTimeout(() => {
          window.location.href = res.redirect
        }, 800)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof ApiClientError ? err.message : 'Authorization failed')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(234,88,12,0.16),transparent_60%),radial-gradient(900px_500px_at_80%_110%,rgba(245,158,11,0.12),transparent_60%)] bg-[#0b0b16] grid place-items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Brand header */}
          <div className="relative px-7 pt-7 pb-5 border-b border-white/10">
            <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-accent/25 blur-[60px]" />
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-white text-lg font-black shadow-lg shadow-accent/30">
                S
              </span>
              <div>
                <p className="font-[family-name:var(--font-display)] text-lg font-black text-white leading-tight">
                  Slide AI
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold">
                  Connection request
                </p>
              </div>
            </div>
          </div>

          <div className="px-7 py-6">
            {status === 'working' ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 size={32} className="animate-spin text-accent" />
                <span className="text-sm text-white/70">Authorizing…</span>
              </div>
            ) : status === 'done' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
                  <CheckCircle2 size={34} className="text-emerald-400" />
                </span>
                <p className="text-base font-bold text-white">All set!</p>
                <span className="text-sm text-white/60">{message}</span>
                <button
                  onClick={() => navigate('/mcp')}
                  className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  Back to Slide AI
                </button>
              </motion.div>
            ) : status === 'error' ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <XCircle size={36} className="text-red-400" />
                <span className="text-sm text-red-400">{message}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-white/50 hover:text-white/80 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm text-white/75 leading-relaxed">
                  {userCode ? (
                    <>
                      Enter the code below on{' '}
                      <span className="font-bold text-white">{clientName}</span> — or, if this
                      page was opened by your CLI, just approve:
                    </>
                  ) : (
                    <>
                      Allow <span className="font-bold text-white">{clientName}</span> to access
                      your Slide AI account:
                    </>
                  )}
                </p>

                {userCode && (
                  <div className="relative my-5 overflow-hidden rounded-2xl border border-accent/40 bg-accent/10 py-4">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent2/10" />
                    <span className="block text-center text-3xl font-black tracking-[0.3em] text-white">
                      {userCode}
                    </span>
                  </div>
                )}

                {/* Permissions */}
                <div className="my-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 mb-2.5">
                    This will allow {clientName} to
                  </p>
                  <ul className="flex flex-col gap-2 text-sm text-white/80">
                    {[
                      'List and open your presentations',
                      'Create new decks and edit slides',
                      'Add animations and custom designs',
                    ].map((perm) => (
                      <li key={perm} className="flex items-center gap-2.5">
                        <CheckCircle2 size={15} className="text-emerald-400/90 shrink-0" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => {
                      setStatus('error')
                      setMessage('Cancelled — nothing was connected.')
                    }}
                    className="flex-1 py-3 rounded-2xl border border-white/15 text-sm font-semibold text-white/60 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={approve}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent2 text-white text-sm font-bold shadow-lg shadow-accent/40 hover:shadow-accent/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Approve
                  </button>
                </div>

                <p className="mt-4 text-[11px] text-white/35 text-center leading-relaxed">
                  Valid for 30 days · revoke anytime by signing out.
                  <br />
                  Only approve codes you generated yourself.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
