'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

export function StatsBar() {
  const { agents, loading } = useAgentStore()

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    idle: agents.filter(a => a.status === 'idle').length,
  }

  const cards = [
    {
      label: 'TOTAL AGENTS',
      value: loading && stats.total === 0 ? '…' : stats.total,
      color: 'text-white',
      bg: 'bg-white/5',
      border: 'border-white/10',
      icon: '⬡',
    },
    {
      label: 'ACTIVE NOW',
      value: loading && stats.total === 0 ? '…' : stats.active,
      color: 'text-active',
      bg: 'bg-active/10',
      border: 'border-active/20',
      icon: '▶',
    },
    {
      label: 'IDLE',
      value: loading && stats.total === 0 ? '…' : stats.idle,
      color: 'text-queued',
      bg: 'bg-queued/10',
      border: 'border-queued/20',
      icon: '◎',
    },
  ]

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
                  key={String(card.value)}
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
    </div>
  )
}
