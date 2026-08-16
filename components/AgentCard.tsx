'use client'

import { motion } from 'framer-motion'
import { AgentAvatar } from './AgentAvatar'
import { StatusBadge } from './StatusBadge'
import type { Agent } from '@/lib/agents'

interface AgentCardProps {
  agent: Agent
}

const MOCK_TASKS: Record<string, string[]> = {
  active: [
    'Analyzing market signals…',
    'Generating content draft…',
    'Processing data pipeline…',
    'Running competitive scan…',
    'Building strategy framework…',
    'Synthesizing research…',
    'Optimizing copy variants…',
    'Evaluating audience fit…',
  ],
  queued: [
    'Awaiting mission brief',
    'In queue — ready',
    'Standing by for task',
    'Pending assignment',
  ],
  completed: [
    'Task delivered ✓',
    'Report submitted ✓',
    'Analysis complete ✓',
    'Draft approved ✓',
    'Mission accomplished ✓',
  ],
}

function getTaskText(agent: Agent): string {
  if (agent.currentTask) return agent.currentTask
  const pool = MOCK_TASKS[agent.status] || MOCK_TASKS.queued
  const idx = agent.id.length % pool.length
  return pool[idx]
}

export function AgentCard({ agent }: AgentCardProps) {
  const taskText = getTaskText(agent)

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
        <AgentAvatar agent={agent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{agent.name}</p>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-xs text-gray-500 truncate font-mono">{taskText}</p>
          {agent.category && (
            <p className="text-xs text-gray-600 mt-1 truncate">{agent.category}</p>
          )}
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
