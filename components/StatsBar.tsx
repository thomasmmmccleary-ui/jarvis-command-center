'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

function formatTokens(n: number | null | undefined): string {
  // null/undefined mean "not measured", which is not the same as zero usage.
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(0)}k`
  return String(n)
}

export function StatsBar() {
  const { agents, loading, activity } = useAgentStore()

  const stats = {
    active: agents.filter(a => a.status === 'active').length,
    idle: agents.filter(a => a.status === 'idle').length,
    missionsToday: activity?.today?.missionsRun ?? 0,
    tokensToday: activity?.today?.tokensUsed ?? null,
  }

  const cards = [
    {
      label: 'ACTIVE NOW',
      value: loading && agents.length === 0 ? '…' : stats.active,
      sub: stats.active > 0 ? 'agents running' : 'all idle',
      color: 'text-active',
      bg: 'bg-active/10',
      border: stats.active > 0 ? 'border-active/30' : 'border-white/10',
      icon: '▶',
      pulse: stats.active > 0,
    },
    {
      label: 'SPECIALISTS',
      value: agents.length > 0 ? agents.length : '…',
      sub: `${stats.idle} idle`,
      color: 'text-white',
      bg: 'bg-white/5',
      border: 'border-white/10',
      icon: '⬡',
      pulse: false,
    },
    {
      label: 'MISSIONS TODAY',
      value: stats.missionsToday || '—',
      sub: activity ? `${activity.today.completedMissions.length} done` : 'loading',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      icon: '◈',
      pulse: false,
    },
    {
      label: 'TOKENS TODAY',
      value: formatTokens(stats.tokensToday),
      sub: activity ? `${activity.today.subagentsLaunched} subagents` : 'loading',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: '⚡',
      pulse: false,
    },
  ]

  return (
    <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          className={`rounded-xl border ${card.bg} ${card.border} p-4 flex items-center justify-between`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div>
            <p className="text-[10px] text-gray-500 tracking-widest mb-1">{card.label}</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={String(card.value)}
                className={`text-2xl font-bold font-mono ${card.color}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {card.value}
              </motion.p>
            </AnimatePresence>
            <p className="text-[10px] text-gray-600 mt-0.5">{card.sub}</p>
          </div>
          <div className="relative">
            {card.pulse && (
              <motion.div
                className={`absolute inset-0 rounded-full opacity-40`}
                style={{ background: 'rgba(99,102,241,0.4)' }}
                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <span className={`text-2xl opacity-30 ${card.color}`}>{card.icon}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
