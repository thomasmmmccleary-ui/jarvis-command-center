'use client'

import { motion } from 'framer-motion'
import { useAgentStore } from '@/lib/store'
import type { CompletedItem } from '@/app/api/activity/route'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60_000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
  } catch {
    return ''
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function CompletedRow({ item, index }: { item: CompletedItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-surface/40 transition-colors"
    >
      {/* Status icon */}
      <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-completed/10 border border-completed/30 flex items-center justify-center">
        <span className="text-completed text-[10px]">✓</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-semibold text-white truncate">{item.label}</span>
          <span className="text-[10px] font-mono text-gray-700 shrink-0">{formatTime(item.completedAt)}</span>
        </div>
        <p className="text-[11px] text-gray-500 line-clamp-1 mb-1">{item.goal}</p>
        <p className="text-[10px] text-gray-600 line-clamp-2 italic">{item.outcome}</p>
        <div className="flex gap-2 mt-1 text-[10px] font-mono text-gray-700">
          {item.durationMs && <span>{formatDuration(item.durationMs)}</span>}
          {item.tokens > 0 && (
            <span>{item.tokens >= 1000 ? `${(item.tokens/1000).toFixed(1)}k` : item.tokens} tok</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function RecentActivity() {
  const { activity, activityLoading } = useAgentStore()

  const items = activity?.recentCompleted ?? []

  if (activityLoading && !activity) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-600 text-xs tracking-wider">
        LOADING…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-20 text-gray-700 gap-1">
        <p className="text-xs tracking-wider">NO RECENT COMPLETIONS</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/40">
      {items.map((item, i) => (
        <CompletedRow key={item.sessionKey} item={item} index={i} />
      ))}
    </div>
  )
}
