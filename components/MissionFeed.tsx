'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore } from '@/lib/store'
import type { MissionRecord } from '@/app/api/activity/route'

function formatDuration(ms?: number): string {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function MissionCard({ mission, index }: { mission: MissionRecord; index: number }) {
  const statusColor = {
    running: 'border-active/40 bg-active/5',
    done: 'border-completed/30 bg-completed/5',
    failed: 'border-red-500/30 bg-red-500/5',
  }[mission.status] ?? 'border-border bg-surface'

  const statusDot = {
    running: 'bg-active',
    done: 'bg-completed',
    failed: 'bg-red-500',
  }[mission.status] ?? 'bg-gray-500'

  const statusLabel = {
    running: 'RUNNING',
    done: 'DONE',
    failed: 'FAILED',
  }[mission.status] ?? 'UNKNOWN'

  const channelIcon = {
    slack: '💬',
    webchat: '🌐',
    direct: '⌨',
    subagent: '⚡',
  }[mission.channel] ?? '◎'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-lg border ${statusColor} p-3`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">{channelIcon}</span>
          <span className="text-xs font-semibold text-white truncate">{mission.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <motion.span
            className={`w-1.5 h-1.5 rounded-full ${statusDot}`}
            animate={mission.status === 'running' ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className={`text-[10px] font-mono font-semibold ${
            mission.status === 'running' ? 'text-active' :
            mission.status === 'done' ? 'text-completed' : 'text-red-400'
          }`}>{statusLabel}</span>
        </div>
      </div>

      {/* Goal */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{mission.goal}</p>

      {/* Metadata row */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
        <span>{formatTime(mission.startedAt)}</span>
        {mission.durationMs && <span>{formatDuration(mission.durationMs)}</span>}
        {mission.tokens > 0 && <span>{formatTokens(mission.tokens)} tok</span>}
        {mission.subagentCount > 0 && (
          <span className="text-violet-500">{mission.subagentCount} subagent{mission.subagentCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Subagent list (if any) */}
      {mission.subagents.length > 0 && (
        <div className="mt-2 border-t border-white/5 pt-2 space-y-1">
          {mission.subagents.slice(0, 4).map((sub) => (
            <div key={sub.key} className="flex items-start gap-1.5">
              <span className={`text-[9px] mt-0.5 ${
                sub.status === 'running' ? 'text-active' :
                sub.status === 'done' ? 'text-completed' : 'text-red-400'
              }`}>
                {sub.status === 'running' ? '▶' : sub.status === 'done' ? '✓' : '✗'}
              </span>
              <p className="text-[10px] text-gray-500 line-clamp-1 flex-1">
                {sub.request ?? sub.label}
              </p>
            </div>
          ))}
          {mission.subagents.length > 4 && (
            <p className="text-[10px] text-gray-700">+{mission.subagents.length - 4} more</p>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function MissionFeed() {
  const { activity, activityLoading, activityError } = useAgentStore()

  if (activityLoading && !activity) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-xs tracking-wider">
        LOADING MISSIONS…
      </div>
    )
  }

  if (activityError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-xs text-red-400">
        ⚠ {activityError}
      </div>
    )
  }

  if (!activity) return null

  const { today } = activity
  const allMissions = [...today.activeMissions, ...today.completedMissions, ...today.failedMissions]

  return (
    <div className="space-y-4">
      {/* Today summary row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'MISSIONS TODAY', value: today.missionsRun, color: 'text-white' },
          { label: 'SUBAGENTS', value: today.subagentsLaunched, color: 'text-violet-400' },
          { label: 'TOKENS USED', value: formatTokens(today.tokensUsed), color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-surface/50 p-2.5 text-center">
            <p className="text-[9px] text-gray-600 tracking-widest mb-1">{card.label}</p>
            <p className={`text-xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Active missions */}
      {today.activeMissions.length > 0 && (
        <div>
          <p className="text-[10px] text-active tracking-widest font-semibold mb-2">▶ RUNNING</p>
          <div className="space-y-2">
            {today.activeMissions.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Completed today */}
      {today.completedMissions.length > 0 && (
        <div>
          <p className="text-[10px] text-completed tracking-widest font-semibold mb-2">✓ COMPLETED TODAY</p>
          <div className="space-y-2">
            {today.completedMissions.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} />
            ))}
          </div>
        </div>
      )}

      {allMissions.length === 0 && (
        <div className="flex items-center justify-center h-20 text-gray-600 text-xs tracking-wider">
          NO MISSIONS RUN TODAY
        </div>
      )}
    </div>
  )
}
