'use client'

import { motion } from 'framer-motion'
import type { AgentStatus } from '@/lib/agents'

interface StatusBadgeProps {
  status: AgentStatus
}

const badgeConfig: Record<AgentStatus, { label: string; classes: string; dot: string }> = {
  active: {
    label: 'ACTIVE',
    classes: 'bg-active/15 text-active border-active/30',
    dot: 'bg-active',
  },
  queued: {
    label: 'QUEUED',
    classes: 'bg-queued/15 text-queued border-queued/30',
    dot: 'bg-queued',
  },
  completed: {
    label: 'DONE',
    classes: 'bg-completed/15 text-completed border-completed/30',
    dot: 'bg-completed',
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = badgeConfig[status]

  return (
    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${config.classes}`}>
      <motion.span
        className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
        animate={status === 'active' ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {config.label}
    </span>
  )
}
