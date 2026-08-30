import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { request, ApiClientError } from '../lib/api'
import { Button } from '../components/ui/Button'

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
        setMessage('Authorized! Your CLI is connected for 30 days — you can close this page.')
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
    <div className="min-h-screen grid place-items-center bg-bg p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 text-accent ring-1 ring-accent/20">
          <ShieldCheck size={22} />
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
          {status === 'done' ? 'Connected!' : 'Authorize your CLI'}
        </h1>

        {status === 'working' ? (
          <div className="flex flex-col items-center gap-3 mt-6">
            <Loader2 size={26} className="animate-spin text-accent" />
            <span className="text-sm text-text-muted">Authorizing…</span>
          </div>
        ) : status === 'done' ? (
          <div className="flex flex-col items-center gap-3 mt-6">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <span className="text-sm text-text-muted">{message}</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/mcp')}>
              Back to Slide AI
            </Button>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-3 mt-6">
            <XCircle size={36} className="text-red-400" />
            <span className="text-sm text-red-400">{message}</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-muted mt-3">
              {userCode ? (
                <>
                  Approve the device with code <span className="font-bold text-text">{userCode}</span> to
                  connect it to your Slide AI account for <span className="font-bold text-text">30 days</span>.
                </>
              ) : (
                <>
                  Allow <span className="font-bold text-text">{clientName}</span> to access your Slide AI
                  account for <span className="font-bold text-text">30 days</span> (create and edit
                  presentations).
                </>
              )}
            </p>
            {userCode && (
              <div className="my-5 py-3 rounded-xl border border-accent/40 bg-accent/10">
                <span className="text-3xl font-bold tracking-[0.3em] text-accent">{userCode}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={approve}
            >
              Approve
            </Button>
            <p className="text-[11px] text-text-dim mt-3">
              Only approve codes you generated yourself. You can revoke access by signing out.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
