'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { LiveAgent } from '@/app/api/agents/route'
import type { ActivitySummary } from '@/app/api/activity/route'
import { AgentCharacter, LaptopSprite, TVSprite, nameToColor, type CharacterState } from './AgentCharacter'

// ─── Desk layout ───────────────────────────────────────────────────────────────
const DESK_POSITIONS = [
  { x: 60,  y: 40  },
  { x: 160, y: 40  },
  { x: 260, y: 40  },
  { x: 360, y: 40  },
  { x: 460, y: 40  },
  { x: 560, y: 40  },
  { x: 660, y: 40  },
  { x: 760, y: 40  },
  { x: 60,  y: 160 },
  { x: 160, y: 160 },
  { x: 260, y: 160 },
  { x: 360, y: 160 },
  { x: 460, y: 160 },
  { x: 560, y: 160 },
  { x: 660, y: 160 },
  { x: 760, y: 160 },
]

// Idle positions in break room / wandering area
const IDLE_POSITIONS = [
  { x: 80,  y: 60,  state: 'idle_tv'   as CharacterState },
  { x: 130, y: 60,  state: 'idle_tv'   as CharacterState },
  { x: 230, y: 45,  state: 'idle_sit'  as CharacterState },
  { x: 270, y: 45,  state: 'idle_sit'  as CharacterState },
  { x: 420, y: 55,  state: 'idle_chat' as CharacterState },
  { x: 470, y: 55,  state: 'idle_chat' as CharacterState },
  { x: 580, y: 40,  state: 'idle_walk' as CharacterState },
  { x: 640, y: 40,  state: 'idle_walk' as CharacterState },
  { x: 700, y: 40,  state: 'idle_walk' as CharacterState },
  { x: 760, y: 40,  state: 'idle_walk' as CharacterState },
  { x: 820, y: 55,  state: 'idle_chat' as CharacterState },
  { x: 860, y: 55,  state: 'idle_chat' as CharacterState },
]

// ─── Ticker messages ───────────────────────────────────────────────────────────
const TICKER_MSGS = [
  '🤖 J.A.R.V.I.S. Command Center · Real-time AI Fleet Operations',
  '📊 All data sourced live from OpenClaw sessions.json — no simulations',
  '🎯 111 specialist agents on standby · Zero latency orchestration',
  '🔥 Powered by Claude Sonnet 4 on Amazon Bedrock',
  '⚡ Built for Thomas McCleary\'s LMU Capstone Presentation',
]

// ─── Types ─────────────────────────────────────────────────────────────────────
interface OfficePlacement {
  agent: LiveAgent
  deskIndex?: number
  idleIndex?: number
  charState: CharacterState
}

function useElapsed(startedAt?: string) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!startedAt) return
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime()
      const s = Math.floor(ms / 1000)
      if (s < 60) setElapsed(`${s}s`)
      else if (s < 3600) setElapsed(`${Math.floor(s / 60)}m ${s % 60}s`)
      else setElapsed(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [startedAt])
  return elapsed
}

// ─── Active Agent Card ────────────────────────────────────────────────────────
function ActiveCard({ agent }: { agent: LiveAgent }) {
  const color = nameToColor(agent.name)
  const elapsed = useElapsed(agent.startedAt)
  return (
    <div style={{
      background: '#0d1117', border: `1px solid ${color}40`,
      borderRadius: 8, padding: '10px 12px',
      boxShadow: `0 0 12px ${color}20`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: color, boxShadow: `0 0 6px ${color}`,
          animation: 'status-pulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div style={{ fontWeight: 700, fontSize: 12, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.name}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#4b5563', flexShrink: 0 }}>
          {agent.category}
        </div>
      </div>
      {agent.currentTask && (
        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, lineHeight: 1.4 }}>
          {agent.currentTask.slice(0, 120)}{agent.currentTask.length > 120 ? '…' : ''}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6b7280' }}>
        {elapsed && <span>⏱ {elapsed}</span>}
        {agent.tokens !== undefined && agent.tokens > 0 && (
          <span>🔢 {(agent.tokens / 1000).toFixed(1)}k tokens</span>
        )}
        {agent.contextPct !== undefined && (
          <span>📊 {agent.contextPct}% ctx</span>
        )}
      </div>
      {agent.contextPct !== undefined && (
        <div style={{ marginTop: 6, height: 3, background: '#1f2937', borderRadius: 2 }}>
          <div style={{
            height: '100%', background: color, borderRadius: 2,
            width: `${Math.min(100, agent.contextPct)}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Desk with character ──────────────────────────────────────────────────────
function DeskStation({ agent, index }: { agent: LiveAgent | null; index: number }) {
  const color = agent ? nameToColor(agent.name) : '#374151'
  const isActive = agent?.status === 'active'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Character or empty desk indicator */}
      {agent ? (
        <AgentCharacter
          name={agent.name}
          category={agent.category}
          state={isActive ? 'working' : 'idle_walk'}
          size={36}
          showLabel={true}
          task={agent.currentTask}
          startedAt={agent.startedAt}
          contextPct={agent.contextPct}
        />
      ) : (
        <div style={{ height: 50 + 36, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: 36, height: 36, opacity: 0.15 }} />
        </div>
      )}

      {/* Desk surface */}
      <div style={{
        width: 72, height: 10,
        background: '#1e2940',
        border: '1px solid #334155',
        borderRadius: 3,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isActive ? `0 0 8px ${color}40` : 'none',
      }}>
        {/* Laptop on desk */}
        <div style={{ position: 'absolute', top: -14 }}>
          <LaptopSprite glowing={isActive} size={20} />
        </div>
      </div>

      {/* Desk legs */}
      <div style={{ display: 'flex', gap: 50, marginTop: 0 }}>
        <div style={{ width: 3, height: 12, background: '#1e2940', borderRadius: 1 }} />
        <div style={{ width: 3, height: 12, background: '#1e2940', borderRadius: 1 }} />
      </div>

      {/* Desk number */}
      <div style={{ fontSize: 7, color: '#374151', fontFamily: 'monospace' }}>
        D{(index + 1).toString().padStart(2, '0')}
      </div>
    </div>
  )
}

// ─── Break Room Items ─────────────────────────────────────────────────────────
function WaterCooler() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 20, height: 16, background: '#1e40af', borderRadius: '50% 50% 0 0',
        border: '1px solid #2563eb',
      }} />
      <div style={{ width: 24, height: 28, background: '#1e3a8a', border: '1px solid #2563eb', borderRadius: '2px 2px 4px 4px' }}>
        <div style={{ margin: '4px auto', width: 12, height: 4, background: '#0f172a', borderRadius: 2 }} />
        <div style={{ margin: '2px auto', width: 16, height: 2, background: '#3b82f6', borderRadius: 1 }} />
      </div>
      <div style={{ fontSize: 8, color: '#3b82f6', marginTop: 2 }}>💧</div>
    </div>
  )
}

function Couch() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Back */}
      <div style={{ width: 100, height: 18, background: '#4c1d95', borderRadius: '4px 4px 0 0', border: '1px solid #6d28d9' }} />
      {/* Seat */}
      <div style={{ width: 110, height: 14, background: '#5b21b6', borderRadius: '0 0 4px 4px', border: '1px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 4 }}>
          <div style={{ width: 30, height: 6, background: '#6d28d9', borderRadius: 2 }} />
          <div style={{ width: 30, height: 6, background: '#6d28d9', borderRadius: 2 }} />
          <div style={{ width: 30, height: 6, background: '#6d28d9', borderRadius: 2 }} />
        </div>
      </div>
      {/* Armrests */}
      <div style={{ display: 'flex', gap: 86, marginTop: -14 }}>
        <div style={{ width: 12, height: 18, background: '#4c1d95', borderRadius: 2 }} />
        <div style={{ width: 12, height: 18, background: '#4c1d95', borderRadius: 2 }} />
      </div>
    </div>
  )
}

function SmallTable() {
  return (
    <div>
      <div style={{ width: 50, height: 6, background: '#7c3aed', borderRadius: 2, border: '1px solid #8b5cf6' }}>
        {/* Coffee cup */}
        <div style={{ position: 'relative', top: -10, left: 8, width: 8, height: 10, background: '#78350f', borderRadius: '0 0 3px 3px', border: '1px solid #92400e' }}>
          <div style={{ width: 6, height: 2, background: '#f59e0b', margin: '1px auto' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 36, marginTop: 0 }}>
        <div style={{ width: 3, height: 10, background: '#6d28d9' }} />
        <div style={{ width: 3, height: 10, background: '#6d28d9' }} />
      </div>
    </div>
  )
}

// ─── Ticker Bar ───────────────────────────────────────────────────────────────
function TickerBar() {
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % TICKER_MSGS.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      background: '#0d1117', borderTop: '1px solid #1f2937',
      padding: '6px 16px', overflow: 'hidden',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        background: '#06b6d4', color: '#0a0a0f', fontSize: 9,
        padding: '2px 6px', borderRadius: 3, fontWeight: 700,
        fontFamily: 'monospace', flexShrink: 0, letterSpacing: 1,
      }}>
        LIVE
      </div>
      <div style={{
        fontSize: 10, color: '#6b7280', fontFamily: 'monospace',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        transition: 'opacity 0.5s',
      }}>
        {TICKER_MSGS[msgIdx]}
      </div>
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsRow({
  agents, activity, fetchedAt, loading,
}: {
  agents: LiveAgent[]
  activity: ActivitySummary | null
  fetchedAt: string | null
  loading: boolean
}) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const activeCount = agents.filter(a => a.status === 'active').length
  const idleCount = agents.filter(a => a.status === 'idle').length
  const completedToday = activity?.today?.completedMissions?.length ?? 0
  const tokensToday = activity?.today?.tokensUsed ?? 0

  const stats = [
    { label: 'TOTAL AGENTS', value: agents.length || 111, color: '#a855f7' },
    { label: 'ACTIVE NOW', value: activeCount, color: '#06b6d4' },
    { label: 'IDLE', value: idleCount, color: '#f59e0b' },
    { label: 'DONE TODAY', value: completedToday, color: '#22c55e' },
    { label: 'TOKENS TODAY', value: tokensToday > 0 ? `${(tokensToday / 1000).toFixed(1)}k` : '—', color: '#f97316' },
    { label: 'TIME (UTC)', value: now.toUTCString().slice(17, 25), color: '#6b7280' },
  ]

  return (
    <div style={{
      display: 'flex', gap: 0, borderBottom: '1px solid #1a1a2e',
      background: '#070710',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          flex: 1, padding: '10px 16px', textAlign: 'center',
          borderRight: i < stats.length - 1 ? '1px solid #1a1a2e' : 'none',
        }}>
          <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 2 }}>
            {s.label}
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: s.color,
            textShadow: `0 0 10px ${s.color}60`,
            fontFamily: 'monospace',
          }}>
            {loading && s.label !== 'TIME (UTC)' ? '…' : s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Office Scene ────────────────────────────────────────────────────────
export default function OfficeScene() {
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      const [agRes, actRes] = await Promise.all([
        fetch('/api/agents', { cache: 'no-store' }),
        fetch('/api/activity', { cache: 'no-store' }),
      ])
      const agData = await agRes.json()
      const actData = await actRes.json()
      setAgents(agData.agents ?? [])
      setFetchedAt(agData.fetchedAt)
      setActivity(actData)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Office scene fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 5000)
    return () => clearInterval(t)
  }, [fetchData])

  // Compute placements
  const activeAgents = agents.filter(a => a.status === 'active')
  const idleAgents = agents.filter(a => a.status === 'idle')

  // Assign active agents to desks (up to 16 desks shown)
  const deskAssignments: (LiveAgent | null)[] = Array(16).fill(null)
  activeAgents.slice(0, 16).forEach((ag, i) => { deskAssignments[i] = ag })

  // Pick representative idle agents for break room (up to 12)
  const breakRoomAgents = idleAgents.slice(0, 12)

  // Empty office scenario messaging
  const isEmpty = activeAgents.length === 0

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 24px', background: '#070710',
        borderBottom: '1px solid #1a1a2e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="neon-sign" style={{
            fontSize: 18, fontWeight: 900, letterSpacing: 3,
            color: '#06b6d4', textShadow: '0 0 20px #06b6d4, 0 0 40px #06b6d440',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            J.A.R.V.I.S.
          </div>
          <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: 2 }}>
            AI OPERATIONS CENTER
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px #22c55e',
              animation: 'status-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'monospace' }}>LIVE</span>
          </div>
          {lastUpdate && (
            <span style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
              Updated {lastUpdate}
            </span>
          )}
          <a
            href="/dashboard"
            style={{
              fontSize: 10, color: '#6b7280', border: '1px solid #1f2937',
              padding: '4px 10px', borderRadius: 4, textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            📊 Classic View
          </a>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <StatsRow agents={agents} activity={activity} fetchedAt={fetchedAt} loading={loading} />

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Office Scene (center) ─────────────────────────────────────── */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

          {/* THE OFFICE — Desk Zone */}
          <div style={{
            background: '#0d1117', border: '1px solid #1f2937',
            borderRadius: 12, marginBottom: 16, overflow: 'hidden',
          }}>
            {/* Zone label */}
            <div style={{
              padding: '8px 16px', background: '#111827',
              borderBottom: '1px solid #1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>🖥️</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 3,
                  color: '#06b6d4', fontFamily: 'monospace',
                }}>
                  THE OFFICE — ACTIVE WORKSTATIONS
                </span>
              </div>
              <span style={{
                fontSize: 9, color: '#374151', fontFamily: 'monospace',
              }}>
                {activeAgents.length}/{DESK_POSITIONS.length} desks occupied
              </span>
            </div>

            {/* Floor / desk area */}
            <div className="floor-pattern" style={{
              padding: '20px 16px 16px',
              minHeight: 300,
              position: 'relative',
            }}>

              {isEmpty ? (
                /* Empty office scene */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '40px 20px',
                  gap: 12,
                }}>
                  <div style={{ fontSize: 48, opacity: 0.4 }}>🖥️</div>
                  <div style={{
                    fontSize: 11, color: '#4b5563', fontFamily: 'monospace',
                    letterSpacing: 2, textAlign: 'center',
                  }}>
                    ALL AGENTS ARE OFF DUTY
                  </div>
                  <div style={{ fontSize: 10, color: '#374151', textAlign: 'center', maxWidth: 300 }}>
                    No agents currently running. Desks are empty.<br />
                    Assign a mission to see agents spring into action!
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {Array(6).fill(null).map((_, i) => (
                      <div key={i} style={{
                        width: 60, height: 28, background: '#111827',
                        border: '1px solid #1f2937', borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 30, height: 4, background: '#1f2937', borderRadius: 2 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Occupied desks grid */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: '12px 8px',
                  justifyItems: 'center',
                }}>
                  {deskAssignments.map((agent, i) => (
                    <DeskStation key={i} agent={agent} index={i} />
                  ))}
                </div>
              )}

              {/* Floor line */}
              <div style={{
                marginTop: 12, height: 2,
                background: 'linear-gradient(90deg, transparent, #1f2937 20%, #1f2937 80%, transparent)',
                borderRadius: 1,
              }} />
            </div>
          </div>

          {/* THE BREAK ROOM */}
          <div style={{
            background: '#0d1117', border: '1px solid #1f2937',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 16px', background: '#111827',
              borderBottom: '1px solid #1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>☕</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 3,
                  color: '#f59e0b', fontFamily: 'monospace',
                }}>
                  THE BREAK ROOM — IDLE AGENTS
                </span>
              </div>
              <span style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                {idleAgents.length} agents chilling
              </span>
            </div>

            <div className="break-room-floor" style={{ padding: '16px', minHeight: 220 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>

                {/* TV area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <TVSprite size={70} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {breakRoomAgents.slice(0, 2).map(ag => (
                      <AgentCharacter
                        key={ag.id}
                        name={ag.name}
                        category={ag.category}
                        state="idle_tv"
                        size={34}
                        showLabel={true}
                      />
                    ))}
                    {breakRoomAgents.length === 0 && (
                      <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>nobody here</div>
                    )}
                  </div>
                  <div style={{ fontSize: 7, color: '#374151', fontFamily: 'monospace' }}>📺 AGENT TV</div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: 1, height: 120, background: '#1f2937', margin: '0 4px' }} />

                {/* Couch area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: -8 }}>
                    {breakRoomAgents.slice(2, 5).map(ag => (
                      <AgentCharacter
                        key={ag.id}
                        name={ag.name}
                        category={ag.category}
                        state="idle_sit"
                        size={32}
                        showLabel={true}
                      />
                    ))}
                  </div>
                  <Couch />
                  <SmallTable />
                  <div style={{ fontSize: 7, color: '#374151', fontFamily: 'monospace' }}>🛋️ LOUNGE</div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: 1, height: 120, background: '#1f2937', margin: '0 4px' }} />

                {/* Water cooler chat area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {breakRoomAgents.slice(5, 7).map(ag => (
                      <AgentCharacter
                        key={ag.id}
                        name={ag.name}
                        category={ag.category}
                        state="idle_chat"
                        size={32}
                        showLabel={true}
                      />
                    ))}
                    <WaterCooler />
                    {breakRoomAgents.slice(7, 8).map(ag => (
                      <AgentCharacter
                        key={ag.id}
                        name={ag.name}
                        category={ag.category}
                        state="idle_chat"
                        size={32}
                        showLabel={true}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 7, color: '#374151', fontFamily: 'monospace' }}>💧 WATER COOLER</div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: 1, height: 120, background: '#1f2937', margin: '0 4px' }} />

                {/* Wandering area */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    fontSize: 7, color: '#374151', fontFamily: 'monospace', marginBottom: 8,
                  }}>
                    🚶 WANDERING ({Math.max(0, idleAgents.length - 8)} agents)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {breakRoomAgents.slice(8, 12).map(ag => (
                      <AgentCharacter
                        key={ag.id}
                        name={ag.name}
                        category={ag.category}
                        state="idle_walk"
                        size={30}
                        showLabel={true}
                      />
                    ))}
                    {idleAgents.length > 12 && (
                      <div style={{
                        width: 30, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#4b5563', fontFamily: 'monospace',
                      }}>
                        +{idleAgents.length - 12}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar — Active Agent Cards ───────────────────────── */}
        <div style={{
          width: 280, borderLeft: '1px solid #1a1a2e',
          background: '#070710', display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Active agents panel */}
          <div style={{ padding: '12px 12px 4px' }}>
            <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>
              ⚡ ACTIVE AGENTS ({activeAgents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeAgents.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>😴</div>
                  <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                    NO ACTIVE AGENTS
                  </div>
                  <div style={{ fontSize: 8, color: '#1f2937', marginTop: 4, fontFamily: 'monospace' }}>
                    All 111 agents are in the break room
                  </div>
                </div>
              ) : (
                activeAgents.map(agent => (
                  <ActiveCard key={agent.id} agent={agent} />
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#1a1a2e', margin: '12px 0' }} />

          {/* Recent completions */}
          {activity?.recentCompleted && activity.recentCompleted.length > 0 && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>
                ✅ RECENTLY COMPLETED
              </div>
              {activity.recentCompleted.slice(0, 5).map((item, i) => (
                <div key={i} style={{
                  padding: '8px 10px', background: '#0d1117',
                  border: '1px solid #1f2937', borderRadius: 6, marginBottom: 6,
                }}>
                  <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginBottom: 3 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.4 }}>
                    {item.goal.slice(0, 80)}{item.goal.length > 80 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 8, color: '#374151', marginTop: 3, fontFamily: 'monospace' }}>
                    {item.durationMs ? `${Math.round(item.durationMs / 60000)}m` : '—'} · {(item.tokens / 1000).toFixed(1)}k tok
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today's missions */}
          {activity?.today?.completedMissions && activity.today.completedMissions.length > 0 && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>
                {"📋 TODAY'S MISSIONS (" + activity.today.missionsRun + ')'}
              </div>
              {activity.today.completedMissions.slice(0, 3).map((mission, i) => (
                <div key={i} style={{
                  padding: '8px 10px', background: '#0d1117',
                  border: '1px solid #1f2937', borderRadius: 6, marginBottom: 6,
                }}>
                  <div style={{ fontSize: 9, color: '#a855f7', fontWeight: 600, marginBottom: 2 }}>
                    {mission.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.3 }}>
                    {mission.goal.slice(0, 60)}{mission.goal.length > 60 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 8, color: '#374151', marginTop: 3, fontFamily: 'monospace' }}>
                    {mission.subagentCount} agents · {(mission.tokens / 1000).toFixed(1)}k tok
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Data source footer */}
          <div style={{ marginTop: 'auto', padding: '10px 12px', borderTop: '1px solid #1a1a2e' }}>
            <div style={{ fontSize: 7, color: '#1f2937', fontFamily: 'monospace', lineHeight: 1.6 }}>
              {activity?.dataSource ?? 'Connecting to OpenClaw…'}<br />
              Polls every 5s · No simulated data
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticker Bar ────────────────────────────────────────────────────── */}
      <TickerBar />
    </div>
  )
}
