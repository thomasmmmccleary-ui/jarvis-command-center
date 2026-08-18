import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface LiveAgent {
  id: string
  name: string
  category: string
  status: 'active' | 'idle'
  currentTask?: string
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

export async function GET() {
  try {
    const [agentsData, statusData] = await Promise.all([
      bridgeFetch('/api/agents'),
      bridgeFetch('/api/live-status'),
    ])

    const statuses: Record<
      string,
      { status: 'working' | 'idle' | 'waiting'; rawStatus: string; lastInteractionAt?: number }
    > = statusData.agents ?? {}

    const rawAgents: Array<{ id: string; name: string; model?: string; toolsProfile?: string }> =
      agentsData.agents ?? []

    const agents: LiveAgent[] = rawAgents.map((a) => {
      const live = statuses[a.id]
      const isActive = live?.status === 'working'
      return {
        id: a.id,
        name: a.id === 'main' ? 'J.A.R.V.I.S.' : a.name,
        category: categoryForToolsProfile(a.toolsProfile),
        status: isActive ? 'active' : 'idle',
        currentTask: isActive ? 'Processing request' : undefined,
        model: a.model,
        lastActiveAt: live?.lastInteractionAt ? new Date(live.lastInteractionAt).toISOString() : undefined,
      }
    })

    const activeCount = agents.filter((a) => a.status === 'active').length

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      totalSessions: agents.length,
      activeCount,
      idleCount: agents.length - activeCount,
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
        idleCount: 0,
        totalAgents: 0,
        agents: [],
      },
      { status: 500 }
    )
  }
}
