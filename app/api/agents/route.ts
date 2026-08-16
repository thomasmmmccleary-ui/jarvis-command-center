import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
import os from 'os'

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

// Full registry of all OpenClaw specialist agents
const AGENT_REGISTRY: Array<{ id: string; name: string; category: string }> = [
  { id: 'main', name: 'J.A.R.V.I.S.', category: 'Platform' },
  { id: 'market-research', name: 'Market Research', category: 'Research' },
  { id: 'audience-insights', name: 'Audience Insights', category: 'Research' },
  { id: 'audience-intelligence', name: 'Audience Intelligence', category: 'Research' },
  { id: 'competitive-intel', name: 'Competitive Intel', category: 'Research' },
  { id: 'campaign-strategy', name: 'Campaign Strategy', category: 'Marketing' },
  { id: 'creative-review', name: 'Creative Review', category: 'Creative' },
  { id: 'content-scheduler', name: 'Content Scheduler', category: 'Operations' },
  { id: 'seo-research', name: 'SEO Research', category: 'SEO' },
  { id: 'email-marketing', name: 'Email Marketing', category: 'Marketing' },
  { id: 'brand-voice', name: 'Brand Voice', category: 'Creative' },
  { id: 'analytics-review', name: 'Analytics Review', category: 'Analytics' },
  { id: 'trend-forecasting', name: 'Trend Forecasting', category: 'Research' },
  { id: 'web-researcher', name: 'Web Researcher', category: 'Research' },
  { id: 'copywriter', name: 'Copywriter', category: 'Creative' },
  { id: 'video-script', name: 'Video Script', category: 'Content' },
  { id: 'ad-creative', name: 'Ad Creative', category: 'Advertising' },
  { id: 'tiktok-strategist', name: 'TikTok Strategist', category: 'Social' },
  { id: 'instagram-strategist', name: 'Instagram Strategist', category: 'Social' },
  { id: 'youtube-strategist', name: 'YouTube Strategist', category: 'Social' },
  { id: 'linkedin-strategist', name: 'LinkedIn Strategist', category: 'Social' },
  { id: 'podcast-producer', name: 'Podcast Producer', category: 'Content' },
  { id: 'paid-ads-manager', name: 'Paid Ads Manager', category: 'Advertising' },
  { id: 'web-developer', name: 'Web Developer', category: 'Engineering' },
  { id: 'webapp-builder', name: 'Webapp Builder', category: 'Engineering' },
  { id: 'api-integrator', name: 'API Integrator', category: 'Engineering' },
  { id: 'database-architect', name: 'Database Architect', category: 'Engineering' },
  { id: 'automation-builder', name: 'Automation Builder', category: 'Engineering' },
  { id: 'documents-agent', name: 'Documents Agent', category: 'Operations' },
  { id: 'github-manager', name: 'GitHub Manager', category: 'Engineering' },
  { id: 'paper-writer', name: 'Paper Writer', category: 'Education' },
  { id: 'research-synthesizer', name: 'Research Synthesizer', category: 'Research' },
  { id: 'academic-coach', name: 'Academic Coach', category: 'Education' },
  { id: 'presentation-builder', name: 'Presentation Builder', category: 'Content' },
  { id: 'case-study-builder', name: 'Case Study Builder', category: 'Content' },
  { id: 'business-plan-writer', name: 'Business Plan Writer', category: 'Strategy' },
  { id: 'pitch-deck-builder', name: 'Pitch Deck Builder', category: 'Strategy' },
  { id: 'market-entry-strategist', name: 'Market Entry Strategist', category: 'Strategy' },
  { id: 'monetization-strategist', name: 'Monetization Strategist', category: 'Strategy' },
  { id: 'funding-researcher', name: 'Funding Researcher', category: 'Research' },
  { id: 'local-marketing-agent', name: 'Local Marketing', category: 'Marketing' },
  { id: 'global-expansion-researcher', name: 'Global Expansion', category: 'Research' },
  { id: 'personal-brand-strategist', name: 'Personal Brand Strategist', category: 'Strategy' },
  { id: 'tiktok-growth-agent', name: 'TikTok Growth', category: 'Social' },
  { id: 'content-repurposer', name: 'Content Repurposer', category: 'Content' },
  { id: 'viral-hook-tester', name: 'Viral Hook Tester', category: 'Content' },
  { id: 'newsletter-builder', name: 'Newsletter Builder', category: 'Content' },
  { id: 'community-manager', name: 'Community Manager', category: 'Social' },
  { id: 'brand-deals-agent', name: 'Brand Deals', category: 'Partnerships' },
  { id: 'pr-media-agent', name: 'PR & Media', category: 'PR' },
  { id: 'partnerships-agent', name: 'Partnerships', category: 'Partnerships' },
  { id: 'affiliate-marketing-agent', name: 'Affiliate Marketing', category: 'Marketing' },
  { id: 'ops-manager', name: 'Ops Manager', category: 'Operations' },
  { id: 'knowledge-base-curator', name: 'Knowledge Base Curator', category: 'Memory' },
  { id: 'legal-plain-english', name: 'Legal Plain English', category: 'Compliance' },
  { id: 'compliance-checker', name: 'Compliance Checker', category: 'Compliance' },
  { id: 'brand-safety-agent', name: 'Brand Safety', category: 'Compliance' },
  { id: 'memory-curator', name: 'Memory Curator', category: 'Memory' },
  { id: 'mission-planner', name: 'Mission Planner', category: 'Operations' },
  { id: 'context-switcher', name: 'Context Switcher', category: 'Platform' },
  { id: 'daily-briefing-agent', name: 'Daily Briefing', category: 'Operations' },
  { id: 'crisis-comms-agent', name: 'Crisis Comms', category: 'PR' },
  { id: 'ai-prompt-engineer', name: 'AI Prompt Engineer', category: 'Platform' },
  { id: 'mockup-designer', name: 'Mockup Designer', category: 'Creative' },
  { id: 'creative-gallery-agent', name: 'Creative Gallery', category: 'Creative' },
  { id: 'tiktok-frame-advisor', name: 'TikTok Frame Advisor', category: 'Creative' },
  { id: 'storyboard-agent', name: 'Storyboard', category: 'Creative' },
  { id: 'ad-mockup-builder', name: 'Ad Mockup Builder', category: 'Advertising' },
  { id: 'ui-ux-designer', name: 'UI/UX Designer', category: 'Creative' },
  { id: 'brand-kit-builder', name: 'Brand Kit Builder', category: 'Creative' },
  { id: 'tiktok-audio-researcher', name: 'TikTok Audio', category: 'Research' },
  { id: 'tiktok-analytics-agent', name: 'TikTok Analytics', category: 'Analytics' },
  { id: 'youtube-seo-agent', name: 'YouTube SEO', category: 'SEO' },
  { id: 'instagram-analytics-agent', name: 'Instagram Analytics', category: 'Analytics' },
  { id: 'course-builder', name: 'Course Builder', category: 'Education' },
  { id: 'merch-strategist', name: 'Merch Strategist', category: 'Strategy' },
  { id: 'pricing-strategist', name: 'Pricing Strategist', category: 'Strategy' },
  { id: 'devops-agent', name: 'DevOps Agent', category: 'Engineering' },
  { id: 'mobile-app-planner', name: 'Mobile App Planner', category: 'Engineering' },
  { id: 'data-analyst', name: 'Data Analyst', category: 'Analytics' },
  { id: 'debate-prep-agent', name: 'Debate Prep', category: 'Education' },
  { id: 'exam-prep-agent', name: 'Exam Prep', category: 'Education' },
  { id: 'professor-perspective-agent', name: 'Professor Perspective', category: 'Education' },
  { id: 'local-seo-agent', name: 'Local SEO', category: 'SEO' },
  { id: 'international-markets-agent', name: 'International Markets', category: 'Research' },
  { id: 'event-marketing-agent', name: 'Event Marketing', category: 'Marketing' },
  { id: 'agent-builder', name: 'Agent Builder', category: 'Platform' },
  { id: 'agent-debugger', name: 'Agent Debugger', category: 'Platform' },
  { id: 'agent-editor', name: 'Agent Editor', category: 'Platform' },
  { id: 'agent-tester', name: 'Agent Tester', category: 'Platform' },
  { id: 'system-auditor', name: 'System Auditor', category: 'Platform' },
  { id: 'mission-reviewer', name: 'Mission Reviewer', category: 'Operations' },
  { id: 'video-intelligence', name: 'Video Intelligence', category: 'Creative' },
  { id: 'youtube-monitor', name: 'YouTube Monitor', category: 'Research' },
  { id: 'news-monitor', name: 'News Monitor', category: 'Research' },
  { id: 'mac-agent', name: 'Mac Agent', category: 'Platform' },
  { id: 'screen-reader-agent', name: 'Screen Reader', category: 'Platform' },
  { id: 'podcast-monitor', name: 'Podcast Monitor', category: 'Research' },
  { id: 'slack-summarizer', name: 'Slack Summarizer', category: 'Operations' },
  { id: 'image-analyzer', name: 'Image Analyzer', category: 'Creative' },
  { id: 'reddit-monitor', name: 'Reddit Monitor', category: 'Research' },
  { id: 'tiktok-scriptwriter', name: 'TikTok Scriptwriter', category: 'Content' },
  { id: 'youtube-scriptwriter', name: 'YouTube Scriptwriter', category: 'Content' },
  { id: 'podcast-scriptwriter', name: 'Podcast Scriptwriter', category: 'Content' },
  { id: 'ad-scriptwriter', name: 'Ad Scriptwriter', category: 'Advertising' },
  { id: 'sales-scriptwriter', name: 'Sales Scriptwriter', category: 'Sales' },
  { id: 'reels-scriptwriter', name: 'Reels Scriptwriter', category: 'Content' },
  { id: 'learning-engine', name: 'Learning Engine', category: 'Memory' },
  { id: 'preference-memory', name: 'Preference Memory', category: 'Memory' },
  { id: 'mission-memory', name: 'Mission Memory', category: 'Memory' },
  { id: 'knowledge-graph', name: 'Knowledge Graph', category: 'Memory' },
]

const REGISTRY_MAP = new Map(AGENT_REGISTRY.map(a => [a.id, a]))

interface RawSession {
  sessionId: string
  status?: string
  updatedAt?: number
  sessionStartedAt?: number
  startedAt?: number
  model?: string
  totalTokens?: number | null
  contextTokens?: number
  thinkingLevel?: string
  chatType?: string
  spawnedBy?: string
}

/**
 * Extract agentId from a session key like "agent:main:slack:channel:xxx" → "main"
 * or "agent:market-research:subagent:..." → "market-research"
 */
function extractAgentId(key: string): string | null {
  const match = key.match(/^agent:([^:]+):/)
  return match ? match[1] : null
}

/**
 * Determine the kind of session from the key
 */
function extractSessionKind(key: string): string {
  if (key.includes(':slack:')) return 'slack'
  if (key.includes(':subagent:')) return 'subagent'
  if (key.includes(':main')) return 'direct'
  return 'direct'
}

/**
 * Describe what a running session is doing based on its key and type
 */
function describeRunningSession(key: string, agentId: string): string {
  const kind = extractSessionKind(key)
  if (kind === 'slack') return 'Processing Slack message'
  if (kind === 'subagent') return 'Executing subagent task'
  if (agentId === 'main') return 'Processing request'
  return 'Running task'
}

/**
 * Read and parse a sessions.json file for a given agent
 */
async function readSessionsFile(agentId: string): Promise<Map<string, RawSession>> {
  const homeDir = process.env.HOME ?? os.homedir()
  const sessionsPath = agentId === 'main'
    ? path.join(homeDir, '.openclaw', 'agents', 'main', 'sessions', 'sessions.json')
    : path.join(homeDir, '.openclaw', 'agents', agentId, 'sessions', 'sessions.json')

  if (!existsSync(sessionsPath)) return new Map()

  try {
    const raw = await readFile(sessionsPath, 'utf-8')
    const data = JSON.parse(raw) as Record<string, RawSession>
    return new Map(Object.entries(data).map(([k, v]) => [k, { ...v }]))
  } catch {
    return new Map()
  }
}

/**
 * Use the sessions JSON file directly — no subprocess needed.
 * This is fast and reliable from within Next.js server context.
 */
async function getAgentStatuses(): Promise<{
  sessions: Array<{ key: string; agentId: string; session: RawSession }>
  totalSessions: number
}> {
  // Read main agent sessions (covers J.A.R.V.I.S. and all subagents spawned from main)
  const mainSessions = await readSessionsFile('main')

  const allSessions: Array<{ key: string; agentId: string; session: RawSession }> = []

  for (const [key, session] of Array.from(mainSessions.entries())) {
    const agentId = extractAgentId(key)
    if (!agentId) continue
    allSessions.push({ key, agentId, session })
  }

  return { sessions: allSessions, totalSessions: allSessions.length }
}

export async function GET() {
  try {
    const { sessions, totalSessions } = await getAgentStatuses()

    // Group sessions by agentId — an agent is active if ANY of its sessions is 'running'
    const agentStateMap = new Map<string, {
      agentId: string
      isActive: boolean
      sessions: Array<{ key: string; session: RawSession }>
      latestSession: { key: string; session: RawSession } | null
    }>()

    for (const { key, agentId, session } of sessions) {
      if (!agentStateMap.has(agentId)) {
        agentStateMap.set(agentId, { agentId, isActive: false, sessions: [], latestSession: null })
      }
      const entry = agentStateMap.get(agentId)!
      entry.sessions.push({ key, session })

      if (session.status === 'running') {
        entry.isActive = true
      }

      const sessionTime = session.updatedAt ?? 0
      const latestTime = entry.latestSession?.session.updatedAt ?? 0
      if (sessionTime > latestTime) {
        entry.latestSession = { key, session }
      }
    }

    const activeAgents: LiveAgent[] = []
    const idleAgents: LiveAgent[] = []
    const processedIds = new Set<string>()

    // Process agents that have session data
    for (const [agentId, entry] of Array.from(agentStateMap.entries())) {
      processedIds.add(agentId)
      const meta = REGISTRY_MAP.get(agentId) ?? {
        id: agentId,
        name: agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        category: 'Platform',
      }

      const latest = entry.latestSession!
      const runningSessions = entry.sessions.filter(s => s.session.status === 'running')

      const agent: LiveAgent = {
        id: agentId,
        name: meta.name,
        category: meta.category,
        status: entry.isActive ? 'active' : 'idle',
        sessionKey: latest.key,
        sessionId: latest.session.sessionId,
        startedAt: new Date(latest.session.sessionStartedAt ?? latest.session.startedAt ?? 0).toISOString(),
        lastActiveAt: new Date(latest.session.updatedAt ?? 0).toISOString(),
        model: latest.session.model,
        tokens: latest.session.totalTokens ?? undefined,
        contextPct: latest.session.totalTokens && latest.session.contextTokens
          ? Math.round((latest.session.totalTokens / latest.session.contextTokens) * 100)
          : undefined,
      }

      if (entry.isActive) {
        const runKey = runningSessions[0].key
        agent.currentTask = describeRunningSession(runKey, agentId)
        activeAgents.push(agent)
      } else {
        idleAgents.push(agent)
      }
    }

    // Add all registered agents that have no session data yet (pure idle)
    for (const agentDef of AGENT_REGISTRY) {
      if (processedIds.has(agentDef.id)) continue
      idleAgents.push({
        id: agentDef.id,
        name: agentDef.name,
        category: agentDef.category,
        status: 'idle',
      })
    }

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      totalSessions,
      activeCount: activeAgents.length,
      idleCount: idleAgents.length,
      totalAgents: activeAgents.length + idleAgents.length,
      agents: [...activeAgents, ...idleAgents],
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
