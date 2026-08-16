import { create } from 'zustand'
import type { LiveAgent } from '@/app/api/agents/route'

// Re-export so components can use the same type
export type { LiveAgent }

// Status buckets shown in the Kanban board
export type DisplayStatus = 'active' | 'idle'

export interface AgentStore {
  agents: LiveAgent[]
  fetchedAt: string | null
  loading: boolean
  error: string | null
  fetchAgents: () => Promise<void>
  startPolling: (intervalMs?: number) => () => void
}

const POLL_INTERVAL_MS = 10_000 // refresh every 10 s

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  fetchedAt: null,
  loading: false,
  error: null,

  async fetchAgents() {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/agents', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({
        agents: data.agents ?? [],
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        loading: false,
        error: null,
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  },

  startPolling(intervalMs = POLL_INTERVAL_MS) {
    // Fetch immediately, then on a timer
    get().fetchAgents()
    const timer = setInterval(() => get().fetchAgents(), intervalMs)
    return () => clearInterval(timer)
  },
}))
