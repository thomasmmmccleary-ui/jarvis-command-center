'use client'

import { useAgentStore } from '@/lib/store'
import { AgentColumn } from './AgentColumn'
import type { DisplayStatus } from '@/lib/store'

const COLUMNS: { status: DisplayStatus; label: string; emoji: string }[] = [
  { status: 'active', label: 'Active', emoji: '▶' },
  { status: 'idle', label: 'Idle', emoji: '◎' },
]

export function KanbanBoard() {
  const { agents, loading, error, fetchedAt } = useAgentStore()

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          ⚠ Could not fetch live agent data: {error}
        </div>
      )}

      {!loading && agents.length === 0 && !error && (
        <div className="mb-4 rounded-lg border border-border bg-surface/50 px-4 py-6 text-center text-sm text-gray-500">
          No active sessions found. Agents appear here when they are running.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {COLUMNS.map(({ status, label, emoji }) => {
          const columnAgents = agents.filter(a => a.status === status)
          return (
            <AgentColumn
              key={status}
              status={status}
              label={label}
              emoji={emoji}
              agents={columnAgents}
            />
          )
        })}
      </div>

      {fetchedAt && (
        <p className="mt-3 text-right text-xs text-gray-700 font-mono">
          Last updated: {new Date(fetchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
