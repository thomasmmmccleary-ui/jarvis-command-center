'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function nameToColor(name: string): string {
  const colors = [
    '#00f5ff', '#7c3aed', '#10b981', '#f59e0b',
    '#f97316', '#3b82f6', '#ec4899', '#84cc16',
    '#14b8a6', '#8b5cf6', '#ef4444', '#d946ef',
    '#0ea5e9', '#22c55e', '#f43f5e',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Agent avatar shape based on index
function AgentShape({ color, initials, idx }: { color: string; initials: string; idx: number }) {
  const shapes = ['50%', '6px', '0', '50% 0 50% 0', '30%']
  const borderRadius = shapes[idx % shapes.length]
  const isDiamond = idx % 5 === 4
  return (
    <div style={{
      width: 30, height: 30, borderRadius,
      background: `rgba(${hexToRgb(color)},0.13)`,
      border: `1.5px solid rgba(${hexToRgb(color)},0.45)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 10px rgba(${hexToRgb(color)},0.22)`,
      flexShrink: 0,
      transform: isDiamond ? 'rotate(45deg)' : 'none',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', transform: isDiamond ? 'rotate(-45deg)' : 'none' }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Glassmorphism Panel with Framer Motion ──────────────────────────────
function GlassPanel({
  children, title, accent = '#00f5ff', badge, delay = 0,
}: {
  children: React.ReactNode; title: string; accent?: string; badge?: string | number; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, type: 'spring', stiffness: 250, damping: 25 }}
      style={{
        background: `rgba(${hexToRgb(accent)},0.025)`,
        border: `1px solid rgba(${hexToRgb(accent)},0.14)`,
        borderRadius: 13,
        overflow: 'hidden',
        boxShadow: `0 0 30px rgba(${hexToRgb(accent)},0.05), 0 8px 24px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid rgba(${hexToRgb(accent)},0.09)`,
        background: `linear-gradient(90deg, rgba(${hexToRgb(accent)},0.05) 0%, transparent 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: 2.5,
          color: accent,
          fontFamily: 'Orbitron, JetBrains Mono, monospace',
          textShadow: `0 0 10px rgba(${hexToRgb(accent)},0.6)`,
        }}>
          {title}
        </span>
        {badge !== undefined && (
          <span style={{
            fontSize: 8,
            background: `rgba(${hexToRgb(accent)},0.12)`,
            color: accent,
            padding: '2px 8px', borderRadius: 10,
            border: `1px solid rgba(${hexToRgb(accent)},0.22)`,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        {children}
      </div>
    </motion.div>
  )
}

// ─── Agent Row with motion ─────────────────────────────────────────────────
function AgentRow({ agent, idx }: {
  agent: { id: string; name: string; category: string; status: string; tokens?: number; contextPct?: number; currentTask?: string }
  idx: number
}) {
  const color = nameToColor(agent.name)
  const isActive = agent.status === 'active'
  const initials = agent.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.3 }}
      whileHover={{ scale: 1.015, boxShadow: `0 0 16px rgba(${hexToRgb(color)},0.18)` }}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 9px',
        background: isActive ? `rgba(${hexToRgb(color)},0.06)` : 'rgba(255,255,255,0.018)',
        border: `1px solid rgba(${hexToRgb(color)},${isActive ? '0.25' : '0.06'})`,
        borderRadius: 8, marginBottom: 5,
        cursor: 'default',
      }}
    >
      <AgentShape color={color} initials={initials} idx={idx} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600,
          color: isActive ? color : 'rgba(148,163,184,0.65)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: 'Inter, sans-serif',
        }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
          {agent.category}
        </div>
      </div>
      <div style={{
        fontSize: 7, padding: '2px 7px', borderRadius: 10,
        background: isActive ? `rgba(${hexToRgb(color)},0.14)` : 'rgba(255,255,255,0.035)',
        color: isActive ? color : 'rgba(71,85,105,0.65)',
        border: `1px solid rgba(${hexToRgb(color)},${isActive ? '0.28' : '0.05'})`,
        fontFamily: 'JetBrains Mono, monospace',
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
      }}>
        {isActive && (
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: color,
            boxShadow: `0 0 5px ${color}`,
            animation: 'status-pulse 1.5s ease-in-out infinite',
          }} />
        )}
        {isActive ? 'ACTIVE' : 'IDLE'}
      </div>
    </motion.div>
  )
}

// ─── Stats bar item ───────────────────────────────────────────────────────
function StatItem({ label, value, color, icon, delay = 0 }: {
  label: string; value: string | number; color: string; icon: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      style={{ padding: '14px 20px', textAlign: 'center' }}
    >
      <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, marginBottom: 5 }}>
        {icon} {label}
      </div>
      <motion.div
        key={String(value)}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          fontSize: 26, fontWeight: 900, color,
          fontFamily: 'JetBrains Mono, monospace',
          textShadow: `0 0 14px rgba(${hexToRgb(color)},0.65), 0 0 28px rgba(${hexToRgb(color)},0.2)`,
        }}
      >
        {value}
      </motion.div>
    </motion.div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { startPolling, agents, activity, error, activityError } = useAgentStore()
  // Was a hardcoded green "SYSTEM ONLINE" label with no data behind it.
  const systemOnline = !error && !activityError

  useEffect(() => {
    // No override — inherit the store's default (3s, matching the bridge's
    // own cache refresh cadence). This page used to hardcode 10s, so it was
    // three times slower to reflect live agent activity than the main view.
    const cleanup = startPolling()
    return cleanup
  }, [startPolling])

  const activeAgents  = agents.filter(a => a.status === 'active')
  const idleAgents    = agents.filter(a => a.status === 'idle')
  const tokensToday   = activity?.today?.tokensUsed ?? null
  const missionsToday = activity?.today?.missionsRun ?? 0
  const activeWork    = activity?.activeWork ?? []
  // Runs the runtime never terminated. Shown as STALLED, never counted as active.
  const stuckWork     = activity?.stuckWork ?? []

  return (
    <main
      className="bg-space-grid bg-scanlines bg-starfield"
      style={{ minHeight: '100vh', background: '#050510' }}
    >
      {/* ── Nav bar ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '11px 24px',
          background: 'rgba(5,5,16,0.93)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(0,245,255,0.09)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 12px rgba(0,245,255,0.12)', '0 0 24px rgba(0,245,255,0.28)', '0 0 12px rgba(0,245,255,0.12)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(124,58,237,0.1))', border: '1px solid rgba(0,245,255,0.22)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 16 }}>🤖</span>
          </motion.div>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 900, letterSpacing: 4,
              color: '#00f5ff',
              textShadow: '0 0 20px rgba(0,245,255,0.8), 0 0 40px rgba(0,245,255,0.25)',
              fontFamily: 'Orbitron, JetBrains Mono, monospace',
              animation: 'neon-blink 7s ease-in-out infinite',
            }}>
              J.A.R.V.I.S.
            </div>
            <div style={{ fontSize: 7.5, color: 'rgba(148,163,184,0.38)', letterSpacing: 3, fontFamily: 'JetBrains Mono, monospace' }}>
              DASHBOARD
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* System online indicator — reflects the store's actual last fetch result */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: systemOnline ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${systemOnline ? '#10b981' : '#ef4444'}`, animation: 'status-pulse 2s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${systemOnline ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.5)'}`, animation: 'ring-pulse 2s ease-out infinite' }} />
            </div>
            <span style={{ fontSize: 8, color: systemOnline ? '#10b981' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5 }}>{systemOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
          </div>
          <a href="/" style={{
            fontSize: 8.5, color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.18)',
            padding: '5px 12px', borderRadius: 6,
            textDecoration: 'none',
            background: 'rgba(0,245,255,0.03)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.5,
          }}>
            ← 🏢 OFFICE VIEW
          </a>
        </div>
      </motion.div>

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      <div className="stats-grid-responsive" style={{
        display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(5,5,16,0.75)',
        position: 'relative',
      }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00f5ff 20%, #7c3aed 50%, #ec4899 80%, transparent)', opacity: 0.4 }} />
        {[
          { label: 'TOTAL AGENTS',   value: agents.length, color: '#7c3aed', icon: '🤖', delay: 0 },
          { label: 'ACTIVE NOW',     value: activeAgents.length,   color: '#00f5ff', icon: '⚡', delay: 0.05 },
          { label: 'MISSIONS TODAY', value: missionsToday,          color: '#10b981', icon: '🎯', delay: 0.1 },
          { label: 'TOKENS TODAY',   value: tokensToday === null ? '—' : `${(tokensToday/1000).toFixed(1)}k`, color: '#f97316', icon: '🔢', delay: 0.15 },
          { label: 'ACTIVE WORK',    value: activeWork.length,      color: '#ec4899', icon: '🔥', delay: 0.2 },
          ...(stuckWork.length > 0
            ? [{ label: 'STALLED', value: stuckWork.length, color: '#ef4444', icon: '⚠', delay: 0.25 }]
            : []),
        ].map((s, i, arr) => (
          <div key={s.label} style={{ borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i === 1 && activeAgents.length > 0 ? 'linear-gradient(180deg, rgba(0,245,255,0.03) 0%, transparent 100%)' : 'transparent' }}>
            <StatItem {...s} />
          </div>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1800, margin: '0 auto',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 390px',
        gap: 20,
      }}>
        {/* LEFT: Full agent roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active agents */}
          <AnimatePresence>
            {activeAgents.length > 0 && (
              <GlassPanel title="⚡ ACTIVE AGENTS" accent="#00f5ff" badge={activeAgents.length} delay={0.1}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {activeAgents.map((ag, i) => <AgentRow key={ag.id} agent={ag} idx={i} />)}
                </div>
              </GlassPanel>
            )}
          </AnimatePresence>

          {/* Full roster */}
          <GlassPanel title="🤖 AGENT ROSTER" accent="#7c3aed" badge={`${agents.length} specialists`} delay={0.15}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
              gap: 5,
              maxHeight: 500, overflowY: 'auto',
            }}>
              {agents.map((ag, i) => <AgentRow key={ag.id} agent={ag} idx={i} />)}
            </div>
          </GlassPanel>
        </div>

        {/* RIGHT: Activity panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Active work */}
          <GlassPanel
            title="🔥 ACTIVE WORK"
            accent="#ec4899"
            badge={activeWork.length > 0 ? activeWork.length : undefined}
            delay={0.2}
          >
            {activeWork.length === 0 ? (
              <motion.div
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ textAlign: 'center', padding: '20px 0', fontSize: 9, color: 'rgba(71,85,105,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                No active work right now
              </motion.div>
            ) : (
              activeWork.map((item, i) => {
                const color = nameToColor(item.agentName)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '9px 10px',
                      background: `rgba(${hexToRgb(color)},0.04)`,
                      border: `1px solid rgba(${hexToRgb(color)},0.16)`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 8, marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, animation: 'status-pulse 1.5s ease-in-out infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace' }}>{item.agentName}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.6)', lineHeight: 1.55 }}>
                      {item.task.slice(0, 120)}{item.task.length > 120 ? '…' : ''}
                    </div>
                    {item.tokens !== null && item.tokens > 0 && (
                      <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.45)', marginTop: 5, fontFamily: 'JetBrains Mono, monospace' }}>
                        {(item.tokens/1000).toFixed(1)}k tokens
                        {item.contextPct !== undefined && ` · ${item.contextPct}% ctx`}
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </GlassPanel>

          {/* Today's missions */}
          <GlassPanel
            title="🎯 TODAY'S MISSIONS"
            accent="#10b981"
            badge={missionsToday > 0 ? `${missionsToday} run` : undefined}
            delay={0.25}
          >
            {(activity?.today?.completedMissions ?? []).length === 0 &&
             (activity?.today?.activeMissions ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 9, color: 'rgba(71,85,105,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                No missions recorded today
              </div>
            ) : (
              [...(activity?.today?.activeMissions ?? []), ...(activity?.today?.completedMissions ?? [])]
                .slice(0, 5)
                .map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      padding: '9px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid rgba(${m.status === 'running' ? '0,245,255' : '16,185,129'},0.13)`,
                      borderLeft: `3px solid ${m.status === 'running' ? '#00f5ff' : '#10b981'}`,
                      borderRadius: 8, marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: m.status === 'running' ? '#00f5ff' : '#10b981' }}>
                        {m.name}
                      </span>
                      <span style={{ fontSize: 7.5, background: m.status === 'running' ? 'rgba(0,245,255,0.10)' : 'rgba(16,185,129,0.10)', color: m.status === 'running' ? '#00f5ff' : '#10b981', padding: '1px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                        {m.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 8.5, color: 'rgba(148,163,184,0.55)', lineHeight: 1.5 }}>
                      {m.goal.slice(0, 80)}{m.goal.length > 80 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.4)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                      {m.subagentCount} agents{m.tokens !== null ? ` · ${(m.tokens/1000).toFixed(1)}k tok` : ''}
                    </div>
                  </motion.div>
                ))
            )}
          </GlassPanel>

          {/* Recent completions */}
          <GlassPanel
            title="✅ RECENT COMPLETIONS"
            accent="#f59e0b"
            badge={activity?.recentCompleted?.length}
            delay={0.3}
          >
            {(activity?.recentCompleted ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 9, color: 'rgba(71,85,105,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                No recent completions
              </div>
            ) : (
              (activity?.recentCompleted ?? []).slice(0, 6).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(245,158,11,0.09)',
                    borderLeft: '3px solid rgba(245,158,11,0.40)',
                    borderRadius: 8, marginBottom: 5,
                  }}
                >
                  <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 8.5, color: 'rgba(148,163,184,0.55)', lineHeight: 1.45 }}>
                    {item.goal.slice(0, 80)}{item.goal.length > 80 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.38)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                    {item.durationMs ? `${Math.round(item.durationMs/60000)}m` : '—'}{item.tokens !== null ? ` · ${(item.tokens/1000).toFixed(1)}k tok` : ''}
                  </div>
                </motion.div>
              ))
            )}
          </GlassPanel>

          {/* Footer */}
          {activity && (
            <div style={{ textAlign: 'right', fontSize: 7.5, color: 'rgba(30,41,59,0.65)', fontFamily: 'JetBrains Mono, monospace' }}>
              {activity.dataSource} · refreshes 10s
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
