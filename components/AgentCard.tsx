'use client'

import { motion } from 'framer-motion'
import { AgentAvatar } from './AgentAvatar'
import { StatusBadge } from './StatusBadge'
import type { LiveAgent } from '@/lib/store'

interface AgentCardProps {
  agent: LiveAgent
}

function formatAge(isoString?: string): string {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function AgentCard({ agent }: AgentCardProps) {
  const taskText = agent.currentTask ?? (agent.status === 'active' ? 'Running…' : 'Idle')
  const ageLabel = formatAge(agent.lastActiveAt)

  return (
    <motion.div
      layout
      layoutId={agent.id}
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative rounded-lg border border-border bg-surface p-3 cursor-default shadow-card hover:shadow-card-hover hover:border-gray-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        <AgentAvatar agent={{ id: agent.id, name: agent.name, category: agent.category, status: agent.status === 'active' ? 'active' : 'queued' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{agent.name}</p>
            <StatusBadge status={agent.status === 'active' ? 'active' : 'queued'} />
          </div>
          <p className="text-xs text-gray-500 truncate font-mono">{taskText}</p>
          <div className="flex items-center justify-between mt-1">
            {agent.category && (
              <p className="text-xs text-gray-600 truncate">{agent.category}</p>
            )}
            {ageLabel && (
              <p className="text-xs text-gray-700 font-mono ml-2 shrink-0">{ageLabel}</p>
            )}
          </div>
        </div>
      </div>

      {/* Active progress bar */}
      {agent.status === 'active' && (
        <div className="mt-2.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-active/60 to-active rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
    </motion.div>
  )
}
