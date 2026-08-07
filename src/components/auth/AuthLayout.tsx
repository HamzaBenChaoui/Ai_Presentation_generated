import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Sun,
  Moon,
  Wand2,
  Palette,
  Users,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const HIGHLIGHTS = [
  {
    icon: Wand2,
    title: 'AI-generated decks in seconds',
    description: 'Describe an idea and get a full, structured presentation.',
  },
  {
    icon: Palette,
    title: 'Live theme switching',
    description: 'Preview beautiful themes that restyle your entire deck instantly.',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    description: 'Share decks, manage roles, and track every action together.',
  },
]

function SpotlightBorder({ children }: { children: ReactNode }) {
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
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/70 p-7 shadow-2xl backdrop-blur-xl"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { resolved, toggle } = useTheme()

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-accent/20 blur-[120px] animate-aurora-1" />
        <div className="absolute top-20 -right-32 h-[460px] w-[460px] rounded-full bg-accent2/20 blur-[120px] animate-aurora-2" />
        <div className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full bg-purple-500/15 blur-[120px] animate-aurora-3" />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(70% 60% at 50% 30%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 30%, black, transparent)',
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex h-16 items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-text hover:text-accent transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white shadow-md shadow-accent/30">
            <Sparkles size={16} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
            SlideAI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text hover:bg-surface2 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/"
            className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-text hover:bg-surface2 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pt-8 pb-20 lg:grid-cols-2 lg:items-center">
        {/* Left branding panel */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
            <ShieldCheck size={14} />
            Secure & private
          </span>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-text xl:text-5xl">
            Your presentations,
            <br />
            <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
              elevated by AI
            </span>
          </h1>

          <div className="mt-10 flex flex-col gap-4">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.12 }}
                className="flex items-start gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-white shadow-md shadow-accent/25">
                  <h.icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-text">{h.title}</p>
                  <p className="text-sm text-text-muted">{h.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right auth card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <SpotlightBorder>
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
            </motion.div>

            <div className="mt-7">{children}</div>
          </SpotlightBorder>
        </motion.div>
      </div>
    </div>
  )
}
