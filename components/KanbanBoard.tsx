'use client'

import { useAgentStore } from '@/lib/store'
import { AgentColumn } from './AgentColumn'
import type { AgentStatus } from '@/lib/agents'

const COLUMNS: { status: AgentStatus; label: string; emoji: string }[] = [
  { status: 'queued', label: 'Queued', emoji: '◎' },
  { status: 'active', label: 'Active', emoji: '▶' },
  { status: 'completed', label: 'Completed', emoji: '✓' },
]

export function KanbanBoard() {
  const { agents } = useAgentStore()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
  )
}
