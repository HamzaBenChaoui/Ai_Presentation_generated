import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Lock } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      const next = searchParams.get('next') || '/dashboard'
      navigate(next)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Sign in failed. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue creating.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 rounded-xl"
          />
        </motion.div>

        <motion.div custom={1} variants={stagger} initial="hidden" animate="show">
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="h-11 rounded-xl"
          />
        </motion.div>

        <motion.div
          custom={2}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-2"
        >
          <button
            type="submit"
            disabled={loading}
            className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent to-accent2 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-accent/45 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                Sign in
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>
        </motion.div>

        <motion.div
          custom={3}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-2 flex items-center justify-between text-sm"
        >
          <span className="flex items-center gap-1.5 text-text-muted">
            <Mail size={14} />
            Don&apos;t have an account?
          </span>
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </motion.div>

        <motion.div
          custom={4}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex items-center justify-center gap-1.5 pt-2 text-xs text-text-dim"
        >
          <Lock size={12} />
          Your data is encrypted and secure
        </motion.div>
      </form>
    </AuthLayout>
  )
}
