'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AgentCard } from './AgentCard'
import type { Agent, AgentStatus } from '@/lib/agents'

interface AgentColumnProps {
  status: AgentStatus
  label: string
  emoji: string
  agents: Agent[]
}

const columnStyles: Record<AgentStatus, {
  headerBg: string
  headerText: string
  borderTop: string
  countBg: string
  countText: string
}> = {
  active: {
    headerBg: 'bg-active/10',
    headerText: 'text-active',
    borderTop: 'border-t-active',
    countBg: 'bg-active/20',
    countText: 'text-active',
  },
  queued: {
    headerBg: 'bg-queued/10',
    headerText: 'text-queued',
    borderTop: 'border-t-queued',
    countBg: 'bg-queued/20',
    countText: 'text-queued',
  },
  completed: {
    headerBg: 'bg-completed/10',
    headerText: 'text-completed',
    borderTop: 'border-t-completed',
    countBg: 'bg-completed/20',
    countText: 'text-completed',
  },
}

export function AgentColumn({ status, label, emoji, agents }: AgentColumnProps) {
  const styles = columnStyles[status]

  return (
    <div className={`rounded-xl border border-border bg-surface/50 overflow-hidden flex flex-col column-${status}`}>
      {/* Column header */}
      <div className={`px-4 py-3 ${styles.headerBg} border-b border-border flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-base ${styles.headerText}`}>{emoji}</span>
          <h2 className={`text-sm font-semibold tracking-wider ${styles.headerText}`}>
            {label.toUpperCase()}
          </h2>
        </div>
        <motion.span
          key={agents.length}
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${styles.countBg} ${styles.countText}`}
          initial={{ scale: 1.3, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {agents.length}
        </motion.span>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-260px)]">
        <AnimatePresence initial={false}>
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </AnimatePresence>

        {agents.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-600 text-xs tracking-wider">
            NO AGENTS
          </div>
        )}
      </div>
    </div>
  )
}
