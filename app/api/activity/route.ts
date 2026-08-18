import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

export interface SessionEvent {
  key: string
  status: 'running' | 'done' | 'failed' | 'killed' | 'unknown'
  startedAt: string | null
  tokens: number
  label: string
  request?: string
  response?: string
}

export interface MissionRecord {
  id: string
  name: string
  goal: string
  status: 'running' | 'done' | 'failed' | 'unknown'
  startedAt: string | null
  completedAt?: string
  durationMs?: number
  tokens: number
  channel: string
  subagentCount: number
  subagents: SessionEvent[]
}

export interface ActiveWorkItem {
  sessionKey: string
  agentId: string
  agentName: string
  task: string
  startedAt: string | null
  tokens: number
  contextPct?: number
  parentMission?: string
}

export interface CompletedItem {
  sessionKey: string
  label: string
  goal: string
  completedAt: string | null
  durationMs?: number
  tokens: number
  outcome: string
}

export interface ActivitySummary {
  fetchedAt: string
  dataSource: string
  bridgeStartedAt?: string
  today: {
    missionsRun: number
    subagentsLaunched: number
    tokensUsed: number
    completedToday: number
    failedToday: number
    completedMissions: MissionRecord[]
    activeMissions: MissionRecord[]
    failedMissions: MissionRecord[]
  }
  activeWork: ActiveWorkItem[]
  recentCompleted: CompletedItem[]
}

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/dashboard-summary`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`)
    const data = (await res.json()) as ActivitySummary
    return NextResponse.json(data)
  } catch (err) {
    console.error('Activity API error:', err)
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        dataSource: `error: ${err instanceof Error ? err.message : String(err)}`,
        today: {
          missionsRun: 0,
          subagentsLaunched: 0,
          tokensUsed: 0,
          completedToday: 0,
          failedToday: 0,
          completedMissions: [],
          activeMissions: [],
          failedMissions: [],
        },
        activeWork: [],
        recentCompleted: [],
      } satisfies ActivitySummary,
      { status: 500 }
    )
  }
}
