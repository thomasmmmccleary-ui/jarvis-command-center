'use client'

import { motion } from 'framer-motion'
import type { Agent } from '@/lib/agents'

interface AgentAvatarProps {
  agent: Agent
  size?: 'sm' | 'md' | 'lg'
}

// Generate a stable color from agent id string
function getAvatarColor(id: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    { bg: 'bg-violet-500/20', text: 'text-violet-400' },
    { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  ]
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(/[-\s]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function AgentAvatar({ agent, size = 'md' }: AgentAvatarProps) {
  const { bg, text } = getAvatarColor(agent.id)
  const initials = getInitials(agent.name)
  const sizeClass = sizeClasses[size]

  return (
    <div className="relative flex-shrink-0">
      {/* Glow ring for active */}
      {agent.status === 'active' && (
        <motion.div
          className={`absolute inset-0 rounded-full`}
          style={{ background: 'rgba(99,102,241,0.3)' }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Avatar circle */}
      <motion.div
        className={`relative ${sizeClass} rounded-full ${bg} border flex items-center justify-center font-semibold font-mono ${text} ${
          agent.status === 'active'
            ? 'border-active/60 avatar-active'
            : agent.status === 'queued'
            ? 'border-queued/40 avatar-queued'
            : 'border-completed/40 avatar-completed'
        }`}
        animate={
          agent.status === 'active'
            ? { y: [0, -2, 0] }
            : agent.status === 'queued'
            ? { opacity: [1, 0.7, 1] }
            : { scale: [1, 1.04, 1] }
        }
        transition={{
          duration: agent.status === 'active' ? 1.5 : agent.status === 'queued' ? 2.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: agent.id.length * 0.05,
        }}
      >
        {initials}

        {/* Completed checkmark overlay */}
        {agent.status === 'completed' && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-completed flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
