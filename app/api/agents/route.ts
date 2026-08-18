import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface LiveAgent {
  id: string
  name: string
  category: string
  // 'waiting' = blocked on approval or on another agent (e.g. a parent
  // mission waiting on a subagent it spawned) — distinct from 'idle' so the
  // dashboard can show *why* an agent isn't actively working.
  // 'failed' = the agent's last turn crashed internally (recency-gated to
  // 30 min on the bridge side). Caught this live: a turn failed right
  // after a subagent returned, and Slack got total silence — no error, no
  // reply, nothing. Without this the dashboard folded that into plain
  // "idle" and gave no sign anything had gone wrong.
  status: 'active' | 'idle' | 'waiting' | 'failed'
  currentTask?: string
  waitingReason?: string
  parentMission?: string
  sessionKey?: string
  sessionId?: string
  startedAt?: string
  lastActiveAt?: string
  model?: string
  tokens?: number
  contextPct?: number
}

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

async function bridgeFetch(path: string) {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Bridge ${path} returned ${res.status}`)
  return res.json()
}

function categoryForToolsProfile(profile?: string): string {
  if (!profile) return 'Platform'
  if (profile === 'messaging') return 'Operations'
  return profile.charAt(0).toUpperCase() + profile.slice(1)
}

interface ActiveWorkItem {
  sessionKey: string
  agentId: string
  agentName: string
  task: string
  startedAt: string | null
  tokens: number
  contextPct?: number
  parentMission?: string
}

export async function GET() {
  try {
    const [agentsData, statusData, dashboardSummary] = await Promise.all([
      bridgeFetch('/api/agents'),
      bridgeFetch('/api/live-status'),
      bridgeFetch('/api/dashboard-summary'),
    ])

    const statuses: Record<
      string,
      { status: 'working' | 'idle' | 'waiting' | 'failed'; rawStatus: string; lastInteractionAt?: number }
    > = statusData.agents ?? {}

    const rawAgents: Array<{ id: string; name: string; model?: string; toolsProfile?: string }> =
      agentsData.agents ?? []

    // dashboard-summary's activeWork carries the *real* task text (read
    // straight from the session transcript) plus which parent mission a
    // subagent is working for — live-status only has a status enum, no
    // detail. Latest session per agentId wins.
    const activeWork: ActiveWorkItem[] = dashboardSummary?.activeWork ?? []
    const activeWorkByAgent = new Map<string, ActiveWorkItem>()
    for (const w of activeWork) {
      if (!activeWorkByAgent.has(w.agentId)) activeWorkByAgent.set(w.agentId, w)
    }

    const agents: LiveAgent[] = rawAgents.map((a) => {
      const live = statuses[a.id]
      const work = activeWorkByAgent.get(a.id)
      const isActive = live?.status === 'working'
      const isWaiting = live?.status === 'waiting'
      const isFailed = live?.status === 'failed'
      const status: LiveAgent['status'] = isActive ? 'active' : isWaiting ? 'waiting' : isFailed ? 'failed' : 'idle'
      return {
        id: a.id,
        name: a.id === 'main' ? 'J.A.R.V.I.S.' : a.name,
        category: categoryForToolsProfile(a.toolsProfile),
        status,
        currentTask: isActive ? work?.task ?? 'Processing request' : undefined,
        waitingReason: isWaiting ? (live?.rawStatus === 'waiting_approval' ? 'Waiting on your approval' : 'Blocked — waiting on another agent') : isFailed ? 'Last turn failed — no reply was sent' : undefined,
        parentMission: work?.parentMission,
        startedAt: work?.startedAt ?? undefined,
        tokens: work?.tokens,
        contextPct: work?.contextPct,
        model: a.model,
        lastActiveAt: live?.lastInteractionAt ? new Date(live.lastInteractionAt).toISOString() : undefined,
      }
    })

    const activeCount = agents.filter((a) => a.status === 'active').length
    const waitingCount = agents.filter((a) => a.status === 'waiting').length
    const failedCount = agents.filter((a) => a.status === 'failed').length

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      totalSessions: agents.length,
      activeCount,
      waitingCount,
      failedCount,
      idleCount: agents.length - activeCount - waitingCount - failedCount,
      totalAgents: agents.length,
      agents,
    })
  } catch (err) {
    console.error('Failed to fetch agent data:', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch agent data',
        message: err instanceof Error ? err.message : String(err),
        fetchedAt: new Date().toISOString(),
        totalSessions: 0,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        idleCount: 0,
        totalAgents: 0,
        agents: [],
      },
      { status: 500 }
    )
  }
}
