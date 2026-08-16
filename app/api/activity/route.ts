import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
import os from 'os'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEvent {
  key: string
  sessionId: string
  status: 'running' | 'done' | 'failed' | 'unknown'
  startedAt: string
  lastActiveAt: string
  tokens: number
  runtimeMs?: number
  spawnedBy?: string
  isSubagent: boolean
  label: string
  request?: string
  response?: string
  children: SessionEvent[]
}

export interface MissionRecord {
  id: string
  name: string
  goal: string
  status: 'running' | 'done' | 'failed'
  startedAt: string
  completedAt?: string
  durationMs?: number
  tokens: number
  channel: string
  subagentCount: number
  subagents: SessionEvent[]
  dataNote?: string
}

export interface ActivitySummary {
  fetchedAt: string
  dataSource: string
  today: {
    missionsRun: number
    subagentsLaunched: number
    tokensUsed: number
    completedMissions: MissionRecord[]
    activeMissions: MissionRecord[]
    failedMissions: MissionRecord[]
  }
  activeWork: ActiveWorkItem[]
  recentCompleted: CompletedItem[]
}

export interface ActiveWorkItem {
  sessionKey: string
  agentId: string
  agentName: string
  task: string
  startedAt: string
  tokens: number
  contextPct?: number
  parentMission?: string
}

export interface CompletedItem {
  sessionKey: string
  label: string
  goal: string
  completedAt: string
  durationMs?: number
  tokens: number
  outcome: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOME = process.env.HOME ?? os.homedir()

function tsToIso(tsMs: number | undefined): string {
  if (!tsMs) return new Date(0).toISOString()
  return new Date(tsMs).toISOString()
}

function todayStartMs(): number {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now.getTime()
}

function labelFromKey(key: string): string {
  const bare = key.replace(/^agent:[^:]+:/, '')
  if (bare.startsWith('slack:')) return 'Slack Session'
  if (bare.startsWith('subagent:')) {
    const uuid = bare.replace('subagent:', '').slice(0, 8)
    return `Subagent (${uuid})`
  }
  if (bare === 'main') return 'Direct Session'
  return bare
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function channelFromKey(key: string): string {
  if (key.includes(':slack:')) return 'slack'
  if (key.includes(':webchat') || key.includes(':main')) return 'webchat'
  if (key.includes(':subagent:')) return 'subagent'
  return 'direct'
}

/**
 * Condense a raw subagent task brief into a readable one-liner.
 * Raw briefs start with "[Subagent Task]\n\n..." — we strip the header
 * and take only the first meaningful sentence.
 */
function condenseTask(raw: string): string {
  // Remove subagent context header
  let t = raw.replace(/^\[Subagent Context\][\s\S]*?\[Subagent Task\]\s*/i, '').trim()
  // Take just the first 200 chars of the first line/sentence
  const firstLine = t.split('\n')[0].trim()
  return firstLine.slice(0, 200) || t.slice(0, 200)
}

interface ParsedContent {
  firstUser: string | null
  taskSummary: string | null
  firstAssistant: string | null
  spawnTasks: string[]
}

async function readLastActivity(filepath: string): Promise<{ lastAction: string | null; lastTool: string | null }> {
  if (!filepath || !existsSync(filepath)) return { lastAction: null, lastTool: null }
  try {
    const raw = await readFile(filepath, 'utf-8')
    const lines = raw.split('\n').filter((l: string) => l.trim())
    const tail = lines.slice(-40)
    let lastAction: string | null = null
    let lastTool: string | null = null
    for (let i = tail.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(tail[i]) as { type: string; message?: { role: string; content: string | Array<{ type: string; text?: string; name?: string }> } }
        if (obj.type !== 'message' || !obj.message) continue
        const { role, content } = obj.message
        if (role === 'assistant' && !lastAction) {
          const textParts: string[] = []
          const tools: string[] = []
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === 'text' && c.text?.trim()) textParts.push(c.text.trim())
              if (c.type === 'toolCall' && c.name) tools.push(c.name)
            }
          } else if (typeof content === 'string') { textParts.push(content) }
          const text = textParts.join(' ').trim()
          if (text) lastAction = text.slice(0, 200)
          if (tools.length && !lastTool) lastTool = tools[0]
          if (lastAction) break
        }
      } catch { /* skip */ }
    }
    return { lastAction, lastTool }
  } catch { return { lastAction: null, lastTool: null } }
}

async function readJsonlMessages(filepath: string, maxLines = 80): Promise<ParsedContent> {
  const result: ParsedContent = { firstUser: null, taskSummary: null, firstAssistant: null, spawnTasks: [] }
  if (!filepath || !existsSync(filepath)) return result

  try {
    const raw = await readFile(filepath, 'utf-8')
    const lines = raw.split('\n').slice(0, maxLines)

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line) as {
          type: string
          message?: {
            role: string
            content: string | Array<{ type: string; text?: string; name?: string; arguments?: Record<string, string> }>
          }
        }
        if (obj.type !== 'message' || !obj.message) continue

        const { role, content } = obj.message
        const textParts: string[] = []

        if (Array.isArray(content)) {
          for (const c of content) {
            if (c.type === 'text' && c.text) textParts.push(c.text)
            if (c.type === 'toolCall' && c.name === 'sessions_spawn' && c.arguments?.task) {
              result.spawnTasks.push(c.arguments.task.slice(0, 300))
            }
          }
        } else if (typeof content === 'string') {
          textParts.push(content)
        }

        const text = textParts.join(' ').trim()
        if (!text) continue

        if (role === 'user') {
          // Strip @mention prefix
          const cleaned = text.replace(/^<@[^>]+>\s*\([^)]+\)\s*/i, '').trim()

          if (!result.firstUser && !cleaned.startsWith('[Subagent Context]') && !cleaned.startsWith('[OpenClaw heartbeat')) {
            result.firstUser = cleaned.slice(0, 400)
          } else if (!result.taskSummary && cleaned.startsWith('[Subagent Context]')) {
            const taskMatch = cleaned.match(/\[Subagent Task\]\s*([\s\S]+)/)
            if (taskMatch) result.taskSummary = condenseTask(taskMatch[1])
          }
        }

        if (role === 'assistant' && !result.firstAssistant && text) {
          result.firstAssistant = text.slice(0, 300)
        }

        if (result.firstUser && result.firstAssistant) break
      } catch { /* skip malformed lines */ }
    }
  } catch { /* file unreadable */ }

  return result
}

// ─── Main handler ─────────────────────────────────────────────────────────────

interface RawSession {
  sessionId: string
  status?: string
  updatedAt?: number
  sessionStartedAt?: number
  startedAt?: number
  endedAt?: number
  runtimeMs?: number
  model?: string
  totalTokens?: number | null
  contextTokens?: number
  spawnedBy?: string
  sessionFile?: string
}

export async function GET() {
  const today = todayStartMs()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  try {
    const sessionsPath = path.join(HOME, '.openclaw', 'agents', 'main', 'sessions', 'sessions.json')

    if (!existsSync(sessionsPath)) {
      return NextResponse.json({
        fetchedAt: new Date().toISOString(),
        dataSource: 'unavailable — sessions.json not found (Vercel deployment without local filesystem access)',
        today: { missionsRun: 0, subagentsLaunched: 0, tokensUsed: 0, completedMissions: [], activeMissions: [], failedMissions: [] },
        activeWork: [],
        recentCompleted: [],
      } satisfies ActivitySummary)
    }

    const raw = await readFile(sessionsPath, 'utf-8')
    const sessionsMap = JSON.parse(raw) as Record<string, RawSession>
    const allEntries = Object.entries(sessionsMap)

    // Sessions to enrich with JSONL content:
    // - All today's sessions
    // - All sessions referenced in recent completed (last 7 days, non-subagent)
    const toEnrichKeys = new Set<string>()
    for (const [key, v] of allEntries) {
      const started = v.sessionStartedAt ?? v.startedAt ?? 0
      if (started >= today) toEnrichKeys.add(key)
      if (v.status === 'done' && (v.updatedAt ?? 0) >= weekAgo && !v.spawnedBy && !key.includes('heartbeat')) {
        toEnrichKeys.add(key)
      }
      if (v.status === 'running') toEnrichKeys.add(key)
    }

    // Also enrich children of recent completed (for subagent detail)
    for (const [key, v] of allEntries) {
      if (v.spawnedBy && toEnrichKeys.has(v.spawnedBy)) {
        toEnrichKeys.add(key)
      }
    }

    // Read JSONL content in parallel (cap at 30 files)
    const toEnrich = allEntries.filter(([k, v]) => toEnrichKeys.has(k) && v.sessionFile)
    const enrichedArr = await Promise.all(
      toEnrich.slice(0, 30).map(async ([key, v]) => {
        const content = await readJsonlMessages(v.sessionFile!, 80)
        return { key, meta: v, content }
      })
    )
    const enrichedMap = new Map(enrichedArr.map(e => [e.key, e]))

    // ── Today's data ────────────────────────────────────────────────────────

    const todayEntries = allEntries.filter(([, v]) => {
      const started = v.sessionStartedAt ?? v.startedAt ?? 0
      return started >= today
    })
    const todayMissions = todayEntries.filter(([, v]) => !v.spawnedBy)
    const todaySubagents = todayEntries.filter(([, v]) => !!v.spawnedBy)

    // Build mission records
    const missionRecords: MissionRecord[] = []
    for (const [key, meta] of todayMissions) {
      if (key.includes('heartbeat')) continue
      const started = meta.sessionStartedAt ?? meta.startedAt ?? 0
      const ended = meta.endedAt ?? meta.updatedAt ?? 0
      const status = (meta.status ?? 'unknown') as MissionRecord['status']
      const enriched = enrichedMap.get(key)
      const content = enriched?.content

      // Build children list
      const children: SessionEvent[] = todaySubagents
        .filter(([, v]) => v.spawnedBy === key)
        .map(([childKey, childMeta]) => {
          const cc = enrichedMap.get(childKey)?.content
          const childStarted = childMeta.sessionStartedAt ?? childMeta.startedAt ?? 0
          return {
            key: childKey,
            sessionId: childMeta.sessionId,
            status: (childMeta.status ?? 'unknown') as SessionEvent['status'],
            startedAt: tsToIso(childStarted),
            lastActiveAt: tsToIso(childMeta.updatedAt),
            tokens: childMeta.totalTokens ?? 0,
            runtimeMs: childMeta.runtimeMs,
            spawnedBy: childMeta.spawnedBy,
            isSubagent: true,
            label: labelFromKey(childKey),
            request: cc?.taskSummary ?? cc?.firstUser ?? undefined,
            response: cc?.firstAssistant ?? undefined,
            children: [],
          }
        })

      const goal = content?.firstUser ?? content?.taskSummary ?? 'Session details loading…'

      missionRecords.push({
        id: meta.sessionId,
        name: labelFromKey(key),
        goal: goal.slice(0, 300),
        status,
        startedAt: tsToIso(started),
        completedAt: status !== 'running' ? tsToIso(ended) : undefined,
        durationMs: status !== 'running' && ended > started ? ended - started : undefined,
        tokens: meta.totalTokens ?? 0,
        channel: channelFromKey(key),
        subagentCount: children.length,
        subagents: children,
        dataNote: content ? undefined : 'Session file not readable',
      })
    }
    missionRecords.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    // ── Active work items ────────────────────────────────────────────────────

    // Fetch last assistant action for running sessions (gives real-time drill-down)
    const runningEntries = allEntries.filter(([, v]) => v.status === 'running')
    const lastActivities = await Promise.all(
      runningEntries.map(async ([key, meta]) => {
        const la = meta.sessionFile ? await readLastActivity(meta.sessionFile) : { lastAction: null, lastTool: null }
        return { key, ...la }
      })
    )
    const lastActivityMap = new Map(lastActivities.map(l => [l.key, l]))

    const activeWork: ActiveWorkItem[] = []
    for (const [key, meta] of allEntries) {
      if (meta.status !== 'running') continue
      const started = meta.sessionStartedAt ?? meta.startedAt ?? 0
      const enriched = enrichedMap.get(key)
      const content = enriched?.content
      const la = lastActivityMap.get(key)

      // Build a meaningful task description
      // Priority: last assistant action (most current) > task summary > first user msg
      let task = 'Processing request'
      if (la?.lastAction) {
        const toolHint = la.lastTool ? ` [${la.lastTool}]` : ''
        task = la.lastAction.slice(0, 200) + toolHint
      } else {
        const rawTask = content?.taskSummary ?? content?.firstUser
        if (rawTask) {
          task = condenseTask(rawTask)
        } else if (key.includes(':slack:')) {
          task = 'Processing incoming Slack message from Thomas'
        } else if (key.includes(':subagent:')) {
          task = 'Executing delegated subagent task'
        }
      }

      const agentMatch = key.match(/^agent:([^:]+):/)
      const agentId = agentMatch ? agentMatch[1] : 'main'

      activeWork.push({
        sessionKey: key,
        agentId,
        agentName: agentId === 'main' ? 'J.A.R.V.I.S.' : agentId,
        task: task.slice(0, 250),
        startedAt: tsToIso(started),
        tokens: meta.totalTokens ?? 0,
        contextPct: meta.totalTokens && meta.contextTokens
          ? Math.round((meta.totalTokens / meta.contextTokens) * 100)
          : undefined,
        parentMission: meta.spawnedBy ? labelFromKey(meta.spawnedBy) : undefined,
      })
    }

    // ── Recent completed ─────────────────────────────────────────────────────

    const recentCompleted: CompletedItem[] = allEntries
      .filter(([key, v]) => {
        const updated = v.updatedAt ?? 0
        return (
          v.status === 'done' &&
          updated >= weekAgo &&
          !v.spawnedBy &&
          !key.includes('heartbeat')
        )
      })
      .map(([key, meta]) => {
        const ended = meta.endedAt ?? meta.updatedAt ?? 0
        const started = meta.sessionStartedAt ?? meta.startedAt ?? 0
        const enriched = enrichedMap.get(key)
        const content = enriched?.content
        const goal = content?.firstUser ?? content?.taskSummary ?? 'Session details not in cache'
        const response = content?.firstAssistant ?? 'Response not stored locally'

        return {
          sessionKey: key,
          label: labelFromKey(key),
          goal: goal.slice(0, 250),
          completedAt: tsToIso(ended),
          durationMs: ended > started ? ended - started : undefined,
          tokens: meta.totalTokens ?? 0,
          outcome: response.slice(0, 200),
        }
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 15)

    const todayTokens = todayEntries.reduce((sum, [, v]) => sum + (v.totalTokens ?? 0), 0)

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      dataSource: 'live — reading OpenClaw sessions.json directly',
      today: {
        missionsRun: missionRecords.length,
        subagentsLaunched: todaySubagents.length,
        tokensUsed: todayTokens,
        completedMissions: missionRecords.filter(m => m.status === 'done'),
        activeMissions: missionRecords.filter(m => m.status === 'running'),
        failedMissions: missionRecords.filter(m => m.status === 'failed'),
      },
      activeWork,
      recentCompleted,
    } satisfies ActivitySummary)

  } catch (err) {
    console.error('Activity API error:', err)
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        dataSource: 'error',
        error: err instanceof Error ? err.message : String(err),
        today: { missionsRun: 0, subagentsLaunched: 0, tokensUsed: 0, completedMissions: [], activeMissions: [], failedMissions: [] },
        activeWork: [],
        recentCompleted: [],
      },
      { status: 500 }
    )
  }
}
