import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

export interface SessionEvent {
  key: string
  status: 'running' | 'done' | 'failed' | 'killed' | 'unknown'
  startedAt: string | null
  /** null = UNKNOWN (no per-item token data exists in the state DB), never a real 0. */
  tokens: number | null
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
  /** null = UNKNOWN (no per-item token data exists in the state DB), never a real 0. */
  tokens: number | null
  channel: string
  subagentCount: number
  subagents: SessionEvent[]
}

export interface ActiveWorkItem {
  sessionKey: string
  agentId: string
  agentName: string
  /**
   * Real lifecycle state from the runtime ledger, never inferred from timestamps.
   * 'STUCK' means the run never reached a terminal event (gateway died mid-turn);
   * such items are excluded from `activeWork` and surfaced in `stuckWork` instead.
   */
  state: 'ACTIVE' | 'WAITING' | 'DELIVERING' | 'STUCK' | 'CANCELLED' | 'UNKNOWN'
  /** Concise current verb, e.g. a live tool name or 'stuck - no terminal event'. */
  activity: string
  task: string
  startedAt: string | null
  /** null = UNKNOWN (no per-item token data exists in the state DB), never a real 0. */
  tokens: number | null
  contextPct?: number
  parentMission?: string
}

export interface CompletedItem {
  sessionKey: string
  label: string
  goal: string
  completedAt: string | null
  durationMs?: number
  /** null = UNKNOWN (no per-item token data exists in the state DB), never a real 0. */
  tokens: number | null
  outcome: string
}

export interface ActivitySummary {
  fetchedAt: string
  dataSource: string
  bridgeStartedAt?: string
  today: {
    missionsRun: number
    subagentsLaunched: number
    /**
     * Total tokens for sessions touched today.
     *
     * `null` means UNKNOWN, not zero: OpenClaw's state DB does not record token
     * counts anywhere, so this comes from a separate 60s `openclaw sessions`
     * snapshot. Before that snapshot lands, or if the bridge is unreachable, the
     * true value is unknown and must render as "—" rather than a confident 0.
     *
     * Caveat: this is each session's LIFETIME total for sessions active today,
     * not a true today-only delta. A real daily delta is not derivable — no
     * runtime table records per-turn token usage.
     */
    tokensUsed: number | null
    completedToday: number
    failedToday: number
    completedMissions: MissionRecord[]
    activeMissions: MissionRecord[]
    failedMissions: MissionRecord[]
  }
  activeWork: ActiveWorkItem[]
  /**
   * Runs the runtime started but never terminated. Deliberately separate from
   * activeWork so no consumer can count them as live work — that overcounting is
   * the agent-shown-working-forever bug. Render as stalled, not active.
   */
  stuckWork: ActiveWorkItem[]
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
          // Bridge unreachable: token usage is unknown, NOT zero.
          tokensUsed: null,
          completedToday: 0,
          failedToday: 0,
          completedMissions: [],
          activeMissions: [],
          failedMissions: [],
        },
        activeWork: [],
        stuckWork: [],
        recentCompleted: [],
      } satisfies ActivitySummary,
      { status: 500 }
    )
  }
}
