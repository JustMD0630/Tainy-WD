import { motion } from 'framer-motion'

export default function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
      <motion.div
        className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-pink-400/30 blur-3xl dark:bg-pink-500/20"
        animate={{ x: [0, 40, -10, 0], y: [0, 18, 42, 0], scale: [1, 1.08, 0.98, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-32 top-10 h-[460px] w-[460px] rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/20"
        animate={{ x: [0, -28, 18, 0], y: [0, 34, 10, 0], scale: [1, 0.98, 1.06, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-160px] left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10"
        animate={{ x: [0, 24, -22, 0], y: [0, -20, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:24px_24px] opacity-60 dark:bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.10)_1px,transparent_0)]" />
    </div>
  )
}
