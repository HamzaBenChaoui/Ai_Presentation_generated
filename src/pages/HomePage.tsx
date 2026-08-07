import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  animate,
} from 'framer-motion'
import {
  Sparkles,
  Users,
  Palette,
  Wand2,
  ArrowRight,
  MonitorPlay,
  Sun,
  Moon,
  Check,
  Layers,
  PenTool,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/* ================================================================== */
/*  Helpers & primitives                                              */
/* ================================================================== */

function MagneticButton({
  children,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'ghost'
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 20 })
  const sy = useSpring(y, { stiffness: 300, damping: 20 })

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3)
  }

  function onLeave() {
    x.set(0)
    y.set(0)
  }

  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold cursor-pointer select-none transition-colors overflow-hidden'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-accent to-accent2 text-white shadow-lg shadow-accent/25 hover:shadow-accent/40'
      : 'border border-border bg-surface text-text hover:bg-surface2'

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`${base} ${styles}`}
    >
      {children}
    </motion.button>
  )
}

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
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.12), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

function WordReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(' ')
  return (
    <span className="inline-block">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block mr-[0.25em]"
        >
          {w}
        </motion.span>
      ))}
    </span>
  )
}

function CountUp({
  to,
  suffix = '',
  inView,
  start,
}: {
  to: number
  suffix?: string
  inView: boolean
  start: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      delay: start * 0.15,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`
      },
    })
    return () => controls.stop()
  }, [inView, to, suffix, start])

  return (
    <span ref={ref} className="tabular-nums">
      0{suffix}
    </span>
  )
}

/* ================================================================== */
/*  Content                                                           */
/* ================================================================== */

const MARQUEE_ITEMS = [
  'AI Generation',
  'Live Themes',
  'Workspaces',
  'Version History',
  'Real-time Presenting',
  'Team Roles',
  'Public Sharing',
]

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI-Powered Generation',
    description: 'Describe your idea and watch AI assemble a complete, structured deck in seconds.',
    accent: 'from-accent to-accent2',
  },
  {
    icon: Palette,
    title: 'Live Theme Engine',
    description: 'Swap curated themes with an instant live preview across the whole deck.',
    accent: 'from-accent2 to-yellow-500',
  },
  {
    icon: PenTool,
    title: 'Precision Editor',
    description: 'Refine every slide, element, and layout with a fast, fluid editing canvas.',
    accent: 'from-orange-500 to-red-500',
  },
  {
    icon: Users,
    title: 'Team Workspaces',
    description: 'Share decks, assign roles, and keep every collaborator in sync.',
    accent: 'from-accent to-purple-500',
  },
  {
    icon: Layers,
    title: 'Version History',
    description: 'Travel back through versions and restore any moment of your work.',
    accent: 'from-yellow-500 to-accent2',
  },
  {
    icon: MonitorPlay,
    title: 'Present & Share',
    description: 'Go fullscreen or drop a public link — anyone can view instantly.',
    accent: 'from-red-500 to-accent',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Describe your idea',
    description: 'Type a topic, a pitch, or raw notes — the more detail, the sharper the deck.',
  },
  {
    step: '02',
    title: 'Pick your theme',
    description: 'Preview themes live and choose the one that matches your audience.',
  },
  {
    step: '03',
    title: 'Present in minutes',
    description: 'Refine, collaborate, then present or share with a single click.',
  },
]

const HERO_WORDS_1 = ['Create', 'stunning', 'presentations']
const HERO_WORDS_2 = ['powered', 'by', 'AI']

function HeroDeckMockup() {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 18 })
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 18 })

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function onLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: 1000 }}
      className="relative mx-auto mt-16 w-full max-w-2xl"
    >
      {/* Glow behind */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-accent/25 via-accent2/20 to-purple-500/20 blur-2xl" />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-2xl border border-border bg-surface/90 p-2 shadow-2xl backdrop-blur-xl"
      >
        {/* Deck slide preview */}
        <div className="rounded-xl bg-gradient-to-br from-surface2 to-surface3 p-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent2/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <span className="text-[10px] font-medium text-text-dim">slide 3 / 12</span>
          </div>

          <div className="mt-8 space-y-3">
            <div className="h-3 w-2/3 rounded-full bg-gradient-to-r from-accent to-accent2" />
            <div className="h-3 w-1/2 rounded-full bg-gradient-to-r from-accent/60 to-accent2/60" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                  className="h-16 rounded-lg bg-surface shadow-sm border border-border"
                />
              ))}
            </div>
            <div className="h-2 w-1/4 rounded-full bg-border mt-6" />
            <div className="h-2 w-1/3 rounded-full bg-border/70" />
          </div>
        </div>

        {/* Floating chips */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-5 -right-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-xl"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Wand2 size={13} />
          </span>
          <span className="text-xs font-semibold text-text">AI deck ready</span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.6, ease: 'easeInOut' }}
          className="absolute -bottom-5 -left-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-xl"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
            <Check size={13} />
          </span>
          <span className="text-xs font-semibold text-text">Theme applied</span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function SpotlightNumber({
  value,
  label,
}: {
  value: number
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-text">
        <CountUp to={value} inView={inView} start={0} />
      </span>
      <span className="mt-1 text-xs uppercase tracking-widest text-text-dim">{label}</span>
    </div>
  )
}

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */

export default function HomePage() {
  const navigate = useNavigate()
  const { resolved, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden">
      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-bg/70 px-6 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white shadow-md shadow-accent/30">
            <Sparkles size={16} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
            SlideAI
          </span>
        </motion.div>

        <div className="flex items-center gap-1.5">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text hover:bg-surface2 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-text hover:bg-surface2 transition-colors cursor-pointer"
          >
            Sign in
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            onClick={() => navigate('/signup')}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 text-sm font-semibold text-white shadow-md shadow-accent/25 hover:shadow-accent/40 transition-shadow cursor-pointer"
          >
            Get started
            <ArrowRight size={15} />
          </motion.button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Aurora background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-accent/25 blur-[120px] animate-aurora-1" />
          <div className="absolute top-10 -right-32 h-[420px] w-[420px] rounded-full bg-accent2/25 blur-[120px] animate-aurora-2" />
          <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-purple-500/15 blur-[120px] animate-aurora-3" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(70% 60% at 50% 30%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(70% 60% at 50% 30%, black, transparent)',
          }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-20 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            AI presentation studio
          </motion.div>

          {/* Headline — word-by-word reveal with gradient shimmer */}
          <h1 className="mt-7 font-[family-name:var(--font-display)] text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight text-text">
            <WordReveal text={HERO_WORDS_1.join(' ')} delay={0.15} />
            <br />
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block bg-gradient-to-r from-accent via-accent2 to-purple-500 bg-clip-text text-transparent text-shimmer"
            >
              {HERO_WORDS_2.join(' ')}
            </motion.span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-text-muted"
          >
            SlideAI turns raw ideas into polished, beautifully designed decks.
            Describe what you need, pick a theme, and present in minutes — no
            design skills required.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <MagneticButton onClick={() => navigate('/signup')}>
              Get started free
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => navigate('/login')}>
              Sign in
            </MagneticButton>
          </motion.div>

          {/* Deck mockup */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <HeroDeckMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-surface/50 py-5 marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-10 text-sm font-semibold uppercase tracking-widest text-text-dim">
              {item}
              <Sparkles size={13} className="text-accent/50" />
            </span>
          ))}
        </div>
      </section>

      {/* ── Features (bento) ─────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              Capabilities
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-text">
              Everything you need to present
            </h2>
            <p className="mt-4 text-text-muted">
              From AI-first generation to team collaboration — a complete
              presentation workflow in one place.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                <SpotlightCard className="h-full p-6">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-lg`}
                  >
                    <f.icon size={22} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-text">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.description}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/60 bg-surface/50 py-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-[100px]" />
        <div className="relative mx-auto grid max-w-5xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
          <SpotlightNumber value={12000} label="Decks created" />
          <SpotlightNumber value={48} label="Design themes" />
          <SpotlightNumber value={99} label="Satisfaction %" />
          <SpotlightNumber value={25} label="Second builds" />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              How it works
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-text">
              From idea to deck in three steps
            </h2>
          </motion.div>

          <div className="relative mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Connector line */}
            <div className="pointer-events-none absolute top-6 left-[10%] right-[10%] hidden md:block">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-px w-full origin-left bg-gradient-to-r from-transparent via-accent/50 to-transparent"
              />
            </div>

            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative">
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: i * 0.2 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 font-[family-name:var(--font-display)] font-bold text-white shadow-lg shadow-accent/30 animate-pulse-ring"
                  >
                    {s.step}
                  </motion.span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-text">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-muted">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 flex justify-center"
          >
            <MagneticButton onClick={() => navigate('/signup')}>
              Start creating now
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-accent/10 p-10 sm:p-16 text-center"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-[90px] animate-aurora-2" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent2/20 blur-[90px] animate-aurora-1" />

          <div className="relative">
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-text">
              Your next great presentation
              <br />
              <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
                starts here
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              Join thousands of people creating beautiful decks with AI. Free to
              start — no credit card required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <MagneticButton onClick={() => navigate('/signup')}>
                Get started free
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-surface/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white">
              <Sparkles size={14} />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
              SlideAI
            </span>
          </div>
          <p className="text-xs text-text-dim">
            © {new Date().getFullYear()} SlideAI. Built for people who present.
          </p>
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-medium text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-xs font-medium text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Sign up
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
