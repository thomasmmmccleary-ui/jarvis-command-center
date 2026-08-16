import { create } from 'zustand'
import type { Agent, AgentStatus } from './agents'
import { supabase } from './supabase'

interface AgentStore {
  agents: Agent[]
  initAgents: (agentDefs: Omit<Agent, 'status'>[]) => void
  setAgentStatus: (id: string, status: AgentStatus, task?: string) => void
  startSimulation: () => () => void
}

// Simulation: cycles agents through queued → active → completed → queued
const ACTIVE_SLOTS = 12   // how many agents are active at once
const CYCLE_MS = 2800     // how often a random agent advances

const ACTIVE_TASKS = [
  'Analyzing market trends…',
  'Drafting content strategy…',
  'Running competitive scan…',
  'Synthesizing research data…',
  'Generating creative concepts…',
  'Building audience persona…',
  'Optimizing campaign copy…',
  'Processing analytics feed…',
  'Writing script draft…',
  'Evaluating platform fit…',
  'Mapping content calendar…',
  'Scoring hook variants…',
  'Extracting brand signals…',
  'Compiling mission brief…',
  'Monitoring trend signals…',
  'Building knowledge graph…',
]

function pickTask(): string {
  return ACTIVE_TASKS[Math.floor(Math.random() * ACTIVE_TASKS.length)]
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],

  initAgents(agentDefs) {
    // Distribute: first ACTIVE_SLOTS get active, next ~20 get completed, rest queued
    const agents: Agent[] = agentDefs.map((def, i) => {
      let status: AgentStatus
      if (i < ACTIVE_SLOTS) status = 'active'
      else if (i < ACTIVE_SLOTS + 20) status = 'completed'
      else status = 'queued'
      return {
        ...def,
        status,
        currentTask: status === 'active' ? pickTask() : undefined,
      }
    })
    set({ agents })

    // If Supabase is configured, subscribe to realtime updates
    if (supabase) {
      supabase
        .channel('agents')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agents' },
          (payload) => {
            const row = payload.new as { id: string; status: AgentStatus; current_task?: string }
            if (row?.id) {
              get().setAgentStatus(row.id, row.status, row.current_task ?? undefined)
            }
          }
        )
        .subscribe()
    }
  },

  setAgentStatus(id, status, task) {
    set(state => ({
      agents: state.agents.map(a =>
        a.id === id
          ? { ...a, status, currentTask: task ?? a.currentTask }
          : a
      ),
    }))
  },

  startSimulation() {
    const interval = setInterval(() => {
      const { agents } = get()

      // Pick a random active agent → move to completed
      const activeAgents = agents.filter(a => a.status === 'active')
      if (activeAgents.length > 0) {
        const toComplete = activeAgents[Math.floor(Math.random() * activeAgents.length)]
        get().setAgentStatus(toComplete.id, 'completed', undefined)
      }

      // Pick a random queued agent → move to active
      const queuedAgents = agents.filter(a => a.status === 'queued')
      if (queuedAgents.length > 0) {
        const toActivate = queuedAgents[Math.floor(Math.random() * queuedAgents.length)]
        get().setAgentStatus(toActivate.id, 'active', pickTask())
      }

      // Every ~10 cycles, recycle a completed agent back to queued
      if (Math.random() < 0.15) {
        const completedAgents = agents.filter(a => a.status === 'completed')
        if (completedAgents.length > 0) {
          const toRequeue = completedAgents[Math.floor(Math.random() * completedAgents.length)]
          get().setAgentStatus(toRequeue.id, 'queued', undefined)
        }
      }
    }, CYCLE_MS)

    return () => clearInterval(interval)
  },
}))
