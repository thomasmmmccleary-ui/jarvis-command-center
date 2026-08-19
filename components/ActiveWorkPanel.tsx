'use client'

import { motion } from 'framer-motion'
import { useAgentStore } from '@/lib/store'
import type { ActiveWorkItem } from '@/app/api/activity/route'

function formatAge(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

function WorkItem({ item }: { item: ActiveWorkItem }) {
  const initials = item.agentName
    .split(/[-\s]/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-active/30 bg-active/5 p-3"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(99,102,241,0.25)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative w-9 h-9 rounded-full bg-indigo-500/20 border border-active/60 flex items-center justify-center text-xs font-mono font-semibold text-indigo-400">
            {initials}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-white">{item.agentName}</span>
            <span className="text-[10px] font-mono text-gray-600 shrink-0">{formatAge(item.startedAt)}</span>
          </div>

          {/* Task description */}
          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{item.task}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono">
            {item.contextPct !== undefined && (
              <span className="text-gray-600">{item.contextPct}% ctx</span>
            )}
            {item.tokens !== null && item.tokens > 0 && (
              <span className="text-gray-600">
                {item.tokens >= 1000 ? `${(item.tokens/1000).toFixed(1)}k` : item.tokens} tok
              </span>
            )}
            {item.parentMission && (
              <span className="text-violet-500 truncate">↑ {item.parentMission}</span>
            )}
          </div>
        </div>
      </div>

      {/* Active shimmer bar */}
      <div className="mt-2.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-active/40 to-active rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  )
}

export function ActiveWorkPanel() {
  const { activity, activityLoading } = useAgentStore()

  const activeWork = activity?.activeWork ?? []

  if (activityLoading && !activity) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-xs tracking-wider">
        LOADING…
      </div>
    )
  }

  if (activeWork.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2 text-gray-700">
        <div className="text-2xl opacity-30">◎</div>
        <p className="text-xs tracking-wider">NO ACTIVE WORK</p>
        <p className="text-[10px] text-gray-800">Agents are idle — waiting for a mission</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activeWork.map((item) => (
        <WorkItem key={item.sessionKey} item={item} />
      ))}
    </div>
  )
}
