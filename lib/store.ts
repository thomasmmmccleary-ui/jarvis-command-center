import { create } from 'zustand'
import type { LiveAgent } from '@/app/api/agents/route'
import type { ActivitySummary } from '@/app/api/activity/route'

// Re-export types so components can use them
export type { LiveAgent, ActivitySummary }

// Status buckets shown in the Kanban board
export type DisplayStatus = 'active' | 'idle'

export interface AgentStore {
  // Agent roster
  agents: LiveAgent[]
  fetchedAt: string | null
  loading: boolean
  error: string | null

  // Activity / missions
  activity: ActivitySummary | null
  activityLoading: boolean
  activityError: string | null

  // Actions
  fetchAgents: () => Promise<void>
  fetchActivity: () => Promise<void>
  startPolling: (intervalMs?: number) => () => void
}

// The bridge used to shell out to `openclaw sessions` on every request
// (multi-second) which made fast polling actively harmful. It now serves
// from an in-memory snapshot refreshed every 4s, so 3s polling is safe and
// gives a near-real-time feel without hammering the box.
const POLL_INTERVAL_MS = 3_000

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  fetchedAt: null,
  loading: false,
  error: null,

  activity: null,
  activityLoading: false,
  activityError: null,

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
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  async fetchActivity() {
    set({ activityLoading: true, activityError: null })
    try {
      const res = await fetch('/api/activity', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ activity: data, activityLoading: false, activityError: null })
    } catch (err) {
      set({ activityLoading: false, activityError: err instanceof Error ? err.message : String(err) })
    }
  },

  startPolling(intervalMs = POLL_INTERVAL_MS) {
    get().fetchAgents()
    get().fetchActivity()
    const timer = setInterval(() => {
      get().fetchAgents()
      get().fetchActivity()
    }, intervalMs)
    return () => clearInterval(timer)
  },
}))
