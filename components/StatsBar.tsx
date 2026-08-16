'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

export function StatsBar() {
  const { agents } = useAgentStore()

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    queued: agents.filter(a => a.status === 'queued').length,
    completed: agents.filter(a => a.status === 'completed').length,
  }

  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const cards = [
    {
      label: 'TOTAL AGENTS',
      value: stats.total,
      color: 'text-white',
      bg: 'bg-white/5',
      border: 'border-white/10',
      icon: '⬡',
    },
    {
      label: 'ACTIVE',
      value: stats.active,
      color: 'text-active',
      bg: 'bg-active/10',
      border: 'border-active/20',
      icon: '▶',
    },
    {
      label: 'QUEUED',
      value: stats.queued,
      color: 'text-queued',
      bg: 'bg-queued/10',
      border: 'border-queued/20',
      icon: '◎',
    },
    {
      label: 'COMPLETED',
      value: stats.completed,
      color: 'text-completed',
      bg: 'bg-completed/10',
      border: 'border-completed/20',
      icon: '✓',
    },
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((card) => (
          <motion.div
            key={card.label}
            className={`rounded-xl border ${card.bg} ${card.border} p-4 flex items-center justify-between`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div>
              <p className="text-xs text-gray-500 tracking-widest mb-1">{card.label}</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={card.value}
                  className={`text-3xl font-bold font-mono ${card.color}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {card.value}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className={`text-2xl opacity-40 ${card.color}`}>{card.icon}</span>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-lg bg-surface border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 tracking-wider">MISSION COMPLETION</span>
          <motion.span
            key={completionPct}
            className="text-xs font-mono text-completed font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {completionPct}%
          </motion.span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-active via-completed to-completed rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
