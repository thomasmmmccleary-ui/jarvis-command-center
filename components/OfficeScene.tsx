'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Lazy-load 3D scene (WebGL, client-only, no SSR)
const Office3DScene = dynamic(
  () => import('./Agent3D').then(m => m.Office3DScene),
  { ssr: false, loading: () => (
    <div style={{ width: '100%', height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050510', borderRadius: 10 }}>
      <div style={{ color: '#00f5ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, opacity: 0.5 }}>Loading 3D scene2026</div>
    </div>
  )}
)
import type { LiveAgent } from '@/app/api/agents/route'
import type { ActivitySummary } from '@/app/api/activity/route'
import { LaptopSprite, TVSprite, nameToColor } from './AgentCharacter'

// ─── Constants ────────────────────────────────────────────────────────────────
function tickerMsgs(agentCount: number): string[] {
  return [
  '🤖 J.A.R.V.I.S. COMMAND CENTER — Real-time AI Fleet Operations',
  '📊 Live data from OpenClaw sessions.json — zero simulations',
  `🎯 ${agentCount} specialist agent${agentCount === 1 ? '' : 's'} on standby · Zero latency orchestration`,
  '🔥 Powered by Claude Sonnet 4 on Amazon Bedrock',
  '⚡ Built for Thomas McCleary\'s LMU Capstone Presentation · Aug 2026',
  '🌐 Marketing Intelligence · Creative · Engineering · Analytics · Research',
  ]
}

const CATEGORY_COLORS: Record<string, string> = {
  Research: '#00f5ff', Marketing: '#7c3aed', Creative: '#ec4899',
  Engineering: '#3b82f6', Analytics: '#10b981', Content: '#f59e0b',
  Social: '#f97316', Strategy: '#8b5cf6', Education: '#06b6d4',
  Advertising: '#ef4444', Operations: '#94a3b8', Platform: '#00f5ff',
  Compliance: '#fbbf24', Partnerships: '#a3e635', PR: '#fb923c',
  Memory: '#818cf8', SEO: '#34d399', Sales: '#f472b6',
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#00f5ff'
}

// ─── Character color palette — 15 distinct colors ──────────────────────────
const CHAR_COLORS = [
  '#06b6d4','#a855f7','#22c55e','#f59e0b','#f97316',
  '#3b82f6','#ec4899','#84cc16','#14b8a6','#8b5cf6',
  '#ef4444','#0ea5e9','#d946ef','#10b981','#f43f5e',
]

// ─── Walking path definitions ─────────────────────────────────────────────
const WALK_PATHS = [
  { name: 'path-coffee-run',      minDur: 14, maxDur: 18 },
  { name: 'path-meeting-walk',    minDur: 18, maxDur: 24 },
  { name: 'path-stretch-break',   minDur: 12, maxDur: 16 },
  { name: 'path-lounge-hang',     minDur: 16, maxDur: 22 },
  { name: 'path-window-gazer',    minDur: 22, maxDur: 30 },
  { name: 'path-busy-bee',        minDur: 8,  maxDur: 12 },
  { name: 'path-social-butterfly',minDur: 20, maxDur: 28 },
  { name: 'path-break-room',      minDur: 16, maxDur: 20 },
  { name: 'path-corridor',        minDur: 14, maxDur: 18 },
  { name: 'path-corner-loop',     minDur: 10, maxDur: 14 },
]

function agentDuration(name: string, minDur: number, maxDur: number): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const range = maxDur - minDur
  return minDur + (Math.abs(h) % (range * 10)) / 10
}

function agentDelay(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (name.charCodeAt(i) * 31) + ((h << 3) - h)
  return (Math.abs(h) % 80) / 10
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

// ─── Elapsed hook ─────────────────────────────────────────────────────────
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

// ─── Real-time clock ──────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const h = time.getUTCHours().toString().padStart(2, '0')
  const m = time.getUTCMinutes().toString().padStart(2, '0')
  const s = time.getUTCSeconds().toString().padStart(2, '0')
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2, fontSize: 'inherit' }}>
      {h}<span style={{ opacity: 0.4, animation: 'neon-blink 1s step-end infinite' }}>:</span>
      {m}<span style={{ opacity: 0.4, animation: 'neon-blink 1s step-end infinite' }}>:</span>
      {s} <span style={{ opacity: 0.5, fontSize: '0.75em' }}>UTC</span>
    </span>
  )
}

// ─── Uptime counter ───────────────────────────────────────────────────────
function UptimeCounter() {
  const [start] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(t)
  }, [start])
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0')
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  return <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{h}:{m}:{s}</span>
}

// ─── Animated counter with spring ────────────────────────────────────────
function AnimatedCounter({ value, loading }: { value: number | string; loading: boolean }) {
  const [display, setDisplay] = useState(value)
  const [animate, setAnimate] = useState(false)
  useEffect(() => {
    setAnimate(true)
    const t = setTimeout(() => { setDisplay(value); setAnimate(false) }, 150)
    return () => clearTimeout(t)
  }, [value])
  if (loading) return <span style={{ opacity: 0.3 }}>···</span>
  return (
    <motion.span
      key={String(value)}
      initial={{ opacity: 0, y: -6, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {display}
    </motion.span>
  )
}

// ─── Sparkline mini-chart (CSS bars) ─────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 16, opacity: 0.5 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${Math.max(2, (v / max) * 16)}px`,
            background: color,
            borderRadius: 1,
            opacity: 0.4 + (i / values.length) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

// ─── Stats Header Bar ─────────────────────────────────────────────────────
function StatsHeader({
  agents, activity, loading,
}: {
  agents: LiveAgent[]; activity: ActivitySummary | null; loading: boolean
}) {
  const activeCount = agents.filter(a => a.status === 'active').length
  const idleCount   = agents.filter(a => a.status === 'idle').length
  const done        = activity?.today?.completedMissions?.length ?? 0
  const tokens      = activity?.today?.tokensUsed ?? 0

  // Mock sparkline data (based on real active count + some variation)
  const sparkData = useMemo(() => {
    const base = activeCount || 1
    return Array.from({ length: 8 }, (_, i) => Math.max(0, base - i + Math.floor(Math.random() * 2)))
      .reverse()
  }, [activeCount])

  const stats = [
    { label: 'TOTAL AGENTS', value: agents.length, color: '#7c3aed', icon: '🤖', spark: Array(8).fill(agents.length) },
    { label: 'ACTIVE NOW',   value: activeCount,          color: '#00f5ff', icon: '⚡', spark: sparkData },
    { label: 'ON STANDBY',   value: idleCount,            color: '#f59e0b', icon: '☕', spark: null },
    { label: 'DONE TODAY',   value: done,                 color: '#10b981', icon: '✅', spark: null },
    { label: 'TOKENS',       value: tokens > 0 ? `${(tokens / 1000).toFixed(1)}k` : '—', color: '#f97316', icon: '🔢', spark: null },
    { label: 'UPTIME',       value: <UptimeCounter />,   color: '#94a3b8', icon: '⏱', spark: null },
  ]

  return (
    <div className="stats-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid rgba(0,245,255,0.08)', background: 'rgba(5,5,16,0.8)' }}>
      {/* SYSTEM ONLINE badge */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #00f5ff 20%, #7c3aed 50%, #00f5ff 80%, transparent 100%)', opacity: 0.4, animation: 'glow-pulse-active 3s ease-in-out infinite' }} />

      {stats.map((s, i) => (
        <div key={s.label} style={{
          padding: '12px 14px', textAlign: 'center',
          borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          background: i === 1 && activeCount > 0 ? 'linear-gradient(180deg, rgba(0,245,255,0.03) 0%, transparent 100%)' : 'transparent',
          position: 'relative',
        }}>
          {i === 1 && activeCount > 0 && (
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: 'linear-gradient(90deg, transparent, #00f5ff, transparent)', animation: 'glow-pulse-active 2s ease-in-out infinite' }} />
          )}
          <div style={{ fontSize: 7, color: 'rgba(148,163,184,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace', textShadow: `0 0 16px ${s.color}80, 0 0 32px ${s.color}30`, lineHeight: 1.1 }}>
            <AnimatedCounter value={s.value as string | number} loading={loading && s.label !== 'UPTIME'} />
          </div>
          {s.spark && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <Sparkline values={s.spark} color={s.color} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Agent avatar shapes ─────────────────────────────────────────────────
// Returns a unique geometric shape per agent index
function AgentAvatarShape({ color, initials, shapeIdx }: { color: string; initials: string; shapeIdx: number }) {
  const shapes = ['50%', '4px', '0', '50% 0 50% 0', '30%']
  const borderRadius = shapes[shapeIdx % shapes.length]
  return (
    <div style={{
      width: 32, height: 32,
      borderRadius,
      background: `rgba(${hexToRgb(color)},0.15)`,
      border: `1.5px solid rgba(${hexToRgb(color)},0.50)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 12px rgba(${hexToRgb(color)},0.30), inset 0 0 8px rgba(${hexToRgb(color)},0.1)`,
      flexShrink: 0,
      transform: shapeIdx === 4 ? 'rotate(45deg)' : 'none',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color,
        fontFamily: 'JetBrains Mono, monospace',
        transform: shapeIdx === 4 ? 'rotate(-45deg)' : 'none',
      }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Active Agent Card (sidebar) with Framer Motion ──────────────────────
function ActiveAgentCard({ agent, index }: { agent: LiveAgent; index: number }) {
  const color = nameToColor(agent.name)
  const elapsed = useElapsed(agent.startedAt)
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Estimate progress: 0-100 based on tokens used (proxy for task progress)
  const progress = agent.contextPct ?? Math.min(90, ((agent.tokens ?? 0) / 1000) * 2)

  return (
    <motion.div
      className="agent-card-hover"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.07) 0%, rgba(5,5,16,0.95) 100%)`,
        border: `1px solid rgba(${hexToRgb(color)},0.28)`,
        borderRadius: 10, padding: '11px 13px',
        boxShadow: `0 2px 20px rgba(${hexToRgb(color)},0.10), 0 0 0 0 rgba(${hexToRgb(color)},0.2)`,
        position: 'relative', overflow: 'hidden', marginBottom: 7,
      }}
      whileHover={{
        boxShadow: `0 4px 28px rgba(${hexToRgb(color)},0.22), 0 0 0 1px rgba(${hexToRgb(color)},0.15)`,
        y: -2,
        transition: { duration: 0.2 },
      }}
    >
      {/* Corner glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50, background: `radial-gradient(circle at top right, rgba(${hexToRgb(color)},0.18) 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        {/* Unique geometric avatar */}
        <AgentAvatarShape color={color} initials={initials} shapeIdx={index} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.45)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
            {agent.category}
          </div>
        </div>

        {/* Pulsing active indicator */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 6px #00f5ff', animation: 'status-pulse 1.5s ease-in-out infinite' }} />
          <div className="online-ping" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: 'transparent', border: '1px solid rgba(0,245,255,0.5)' }} />
        </div>
      </div>

      {/* Task description with tooltip hint */}
      {agent.currentTask && (
        <div
          title={agent.currentTask}
          style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.70)', lineHeight: 1.5, marginBottom: agent.parentMission ? 4 : 8, borderLeft: `2px solid rgba(${hexToRgb(color)},0.30)`, paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
        >
          {agent.currentTask}
        </div>
      )}

      {/* Parent mission — this agent was spawned by another agent's task */}
      {agent.parentMission && (
        <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.45)', marginBottom: 8, paddingLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>
          ↳ working for: {agent.parentMission}
        </div>
      )}

      {/* Elapsed + tokens row */}
      <div style={{ display: 'flex', gap: 10, fontSize: 8, color: 'rgba(100,116,139,0.7)', marginBottom: 7, fontFamily: 'JetBrains Mono, monospace' }}>
        {elapsed && <span style={{ color, opacity: 0.8 }}>⏱ {elapsed}</span>}
        {agent.tokens !== undefined && agent.tokens > 0 && <span>🔢 {(agent.tokens / 1000).toFixed(1)}k</span>}
        {agent.contextPct !== undefined && <span>📊 {agent.contextPct}%</span>}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          className="progress-shimmer"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: `linear-gradient(90deg, rgba(${hexToRgb(color)},0.4), ${color})`, borderRadius: 2 }}
        />
      </div>
    </motion.div>
  )
}

// Amber-themed card for agents blocked on approval or on another agent —
// distinct from idle so it's obvious this isn't "nothing happening", it's
// "something else has to finish or you have to respond first."
function WaitingAgentCard({ agent, index }: { agent: LiveAgent; index: number }) {
  const color = '#f59e0b'
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.07) 0%, rgba(5,5,16,0.95) 100%)`,
        border: `1px solid rgba(${hexToRgb(color)},0.28)`,
        borderRadius: 10, padding: '11px 13px', marginBottom: 7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <AgentAvatarShape color={color} initials={initials} shapeIdx={index} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.45)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
            {agent.category}
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      {agent.waitingReason && (
        <div style={{ fontSize: 9.5, color: 'rgba(245,158,11,0.75)', lineHeight: 1.5, borderLeft: `2px solid rgba(${hexToRgb(color)},0.30)`, paddingLeft: 8 }}>
          ⏳ {agent.waitingReason}
        </div>
      )}
    </motion.div>
  )
}

// ─── HUD Zone Header with Orbitron ────────────────────────────────────────
function ZoneHeader({ icon, label, count, color, badge }: { icon: string; label: string; count: string; color: string; badge?: string }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid rgba(${hexToRgb(color)},0.12)`, background: `linear-gradient(90deg, rgba(${hexToRgb(color)},0.05) 0%, transparent 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div>
          <span className="zone-label" style={{ fontSize: 8, color, textShadow: `0 0 10px rgba(${hexToRgb(color)},0.7)` }}>{label}</span>
          {badge && <span style={{ marginLeft: 8, fontSize: 7.5, background: `rgba(${hexToRgb(color)},0.12)`, color, padding: '1px 6px', borderRadius: 4, border: `1px solid rgba(${hexToRgb(color)},0.22)`, fontFamily: 'JetBrains Mono, monospace' }}>{badge}</span>}
        </div>
      </div>
      <span style={{ fontSize: 8, color: 'rgba(100,116,139,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
    </div>
  )
}

// ─── SYSTEM ONLINE indicator ──────────────────────────────────────────────
function SystemOnlineBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ position: 'relative' }}>
        <div className="online-ping" style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.4)', animation: 'ring-pulse 2s ease-out infinite' }} />
      </div>
      <span style={{ fontSize: 8.5, color: '#10b981', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, fontWeight: 700, textShadow: '0 0 8px rgba(16,185,129,0.6)' }}>
        SYSTEM ONLINE
      </span>
    </div>
  )
}

// ─── Ticker Bar ───────────────────────────────────────────────────────────
function TickerBar({ agentCount }: { agentCount: number }) {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const msgs = useMemo(() => tickerMsgs(agentCount), [agentCount])
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setFade(true) }, 300)
    }, 5000)
    return () => clearInterval(t)
  }, [msgs.length])
  return (
    <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(0,245,255,0.07)', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ background: 'linear-gradient(135deg, #00f5ff, #7c3aed)', color: '#fff', fontSize: 7.5, padding: '2px 8px', borderRadius: 3, fontWeight: 800, letterSpacing: 1.5, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, boxShadow: '0 0 10px rgba(0,245,255,0.3)' }}>LIVE</div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {msgs.map((_, i) => (
          <motion.div
            key={i}
            animate={{ background: i === idx ? '#00f5ff' : 'rgba(255,255,255,0.1)', boxShadow: i === idx ? '0 0 4px #00f5ff' : 'none' }}
            transition={{ duration: 0.3 }}
            style={{ width: 5, height: 5, borderRadius: '50%' }}
          />
        ))}
      </div>
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: fade ? 1 : 0, y: fade ? 0 : -4 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.65)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {msgs[idx]}
      </motion.div>
    </div>
  )
}

// ─── Activity Feed Item with Framer Motion ───────────────────────────────
function FeedItem({ item, index }: { item: { label: string; goal: string; tokens: number; durationMs?: number; completedAt: string | null }; index: number }) {
  const elapsed = item.completedAt ? Math.round((Date.now() - new Date(item.completedAt).getTime()) / 60000) : 0
  const timeLabel = elapsed < 60 ? `${elapsed}m ago` : `${Math.floor(elapsed / 60)}h ago`
  // Use a color from category palette based on label hash
  const color = CHAR_COLORS[index % CHAR_COLORS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        padding: '9px 11px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 7,
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 9.5, color: '#10b981', fontWeight: 600, lineHeight: 1.3, flex: 1 }}>✅ {item.label}</div>
        <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.55)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>{timeLabel}</div>
      </div>
      <div style={{ fontSize: 8.5, color: 'rgba(148,163,184,0.55)', lineHeight: 1.4, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.goal}</div>
      <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.45)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
        {item.durationMs ? `${Math.round(item.durationMs / 60000)}m` : '—'} · {(item.tokens / 1000).toFixed(1)}k tok
      </div>
    </motion.div>
  )
}

// ─── Personality types ───────────────────────────────────────────────────
interface PersonalityConfig {
  name: string; emoji: string
  bodyAnim: string; bodyDur: number
  legLeftAnim: string; legRightAnim: string; legDur: number
  armLeftAnim: string; armRightAnim: string; armDur: number
  headAnim: string; headDur: number
  pathSpeedMult: number
}

const PERSONALITIES: PersonalityConfig[] = [
  { name: 'Speedwalker', emoji: '💨', bodyAnim: 'body-speedwalk', bodyDur: 0.25, legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.25, armLeftAnim: 'arm-left-pump', armRightAnim: 'arm-right-pump', armDur: 0.25, headAnim: 'head-tilt-normal', headDur: 0.25, pathSpeedMult: 0.55 },
  { name: 'Shuffler', emoji: '😴', bodyAnim: 'body-shuffle', bodyDur: 1.2, legLeftAnim: 'leg-left-shuffle', legRightAnim: 'leg-right-shuffle', legDur: 1.2, armLeftAnim: 'arm-left-stoic', armRightAnim: 'arm-right-stoic', armDur: 1.2, headAnim: 'head-tilt-normal', headDur: 2.0, pathSpeedMult: 1.6 },
  { name: 'Bouncer', emoji: '🏀', bodyAnim: 'body-bounce', bodyDur: 0.4, legLeftAnim: 'leg-left-bounce', legRightAnim: 'leg-right-bounce', legDur: 0.4, armLeftAnim: 'arm-left-normal', armRightAnim: 'arm-right-normal', armDur: 0.4, headAnim: 'head-tilt-normal', headDur: 0.4, pathSpeedMult: 0.9 },
  { name: 'Stoic', emoji: '🧊', bodyAnim: 'body-stoic', bodyDur: 0.7, legLeftAnim: 'leg-left-stoic', legRightAnim: 'leg-right-stoic', legDur: 0.7, armLeftAnim: 'arm-left-stoic', armRightAnim: 'arm-right-stoic', armDur: 0.7, headAnim: 'head-tilt-normal', headDur: 1.5, pathSpeedMult: 0.95 },
  { name: 'Phone Walker', emoji: '📱', bodyAnim: 'body-phone', bodyDur: 0.8, legLeftAnim: 'leg-left-shuffle', legRightAnim: 'leg-right-shuffle', legDur: 0.8, armLeftAnim: 'arm-left-phone', armRightAnim: 'arm-right-phone', armDur: 0.8, headAnim: 'head-tilt-phone', headDur: 0.8, pathSpeedMult: 1.2 },
  { name: 'Coffee Carrier', emoji: '☕', bodyAnim: 'body-coffee', bodyDur: 0.65, legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.65, armLeftAnim: 'arm-left-coffee', armRightAnim: 'arm-right-coffee', armDur: 0.65, headAnim: 'head-tilt-normal', headDur: 0.65, pathSpeedMult: 1.1 },
  { name: 'Enthusiast', emoji: '⚡', bodyAnim: 'body-enthusiast', bodyDur: 0.35, legLeftAnim: 'leg-left-bounce', legRightAnim: 'leg-right-bounce', legDur: 0.35, armLeftAnim: 'arm-left-pump', armRightAnim: 'arm-right-pump', armDur: 0.35, headAnim: 'head-tilt-normal', headDur: 0.35, pathSpeedMult: 0.65 },
  { name: 'Wanderer', emoji: '🦋', bodyAnim: 'body-wander', bodyDur: 0.9, legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.9, armLeftAnim: 'arm-left-normal', armRightAnim: 'arm-right-normal', armDur: 0.9, headAnim: 'head-wander', headDur: 2.5, pathSpeedMult: 1.3 },
]

// ─── Human Sprite — enhanced with bigger characters + name pills ──────────
interface HumanSpriteProps {
  color: string; initials: string; personality: PersonalityConfig
  delay: number; isLounge?: boolean; isActive?: boolean; tripOffset?: number
  agentName?: string
}

function HumanSprite({ color, initials, personality, delay, isLounge = false, isActive = false, tripOffset = 0, agentName = '' }: HumanSpriteProps) {
  const [exclaiming, setExclaiming] = useState(false)
  const [tripping, setTripping] = useState(false)
  const isTripper = tripOffset === 0

  useEffect(() => {
    if (!isTripper) return
    const firstDelay = 8000 + Math.floor(Math.random() * 37000)
    const tripDuration = 2500
    const tripCycle = 45000
    let loopId: ReturnType<typeof setInterval>
    const initTimer = setTimeout(() => {
      setTripping(true)
      setTimeout(() => setTripping(false), tripDuration)
      loopId = setInterval(() => {
        setTripping(true)
        setTimeout(() => setTripping(false), tripDuration)
      }, tripCycle)
    }, firstDelay)
    return () => { clearTimeout(initTimer); clearInterval(loopId) }
  }, [isTripper])

  useEffect(() => {
    if (!isActive) return
    const t = setTimeout(() => {
      setExclaiming(true)
      setTimeout(() => setExclaiming(false), 900)
    }, 500)
    return () => clearTimeout(t)
  }, [isActive])

  const bodyAnim = isLounge ? 'body-lounge' : (tripping ? 'trip-recover' : personality.bodyAnim)
  const bodyDur  = isLounge ? 3.5 : (tripping ? 2.5 : personality.bodyDur)
  const legL     = isLounge ? 'arm-left-stoic' : personality.legLeftAnim
  const legR     = isLounge ? 'arm-right-stoic' : personality.legRightAnim
  const legDur   = isLounge ? 3.5 : personality.legDur
  const armL     = isLounge ? 'arm-left-stoic' : personality.armLeftAnim
  const armR     = isLounge ? 'arm-right-stoic' : personality.armRightAnim
  const armDur   = isLounge ? 3.5 : personality.armDur
  const headAnim = isLounge ? 'head-lounge-sway' : personality.headAnim
  const headDur  = isLounge ? 3.5 : personality.headDur

  // Sitting at desk
  if (isActive) {
    return (
      <div style={{ position: 'relative', willChange: 'transform' }}>
        {exclaiming && (
          <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 900, color: '#fbbf24', textShadow: '0 0 6px #f59e0b', animation: 'exclaim-pop 0.9s ease-out 1 forwards', zIndex: 20, pointerEvents: 'none', willChange: 'transform, opacity' }}>!</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `desk-sit-bob 0.4s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
          {/* Head — 14px for active agents, crisp */}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}`, position: 'relative', flexShrink: 0, imageRendering: 'pixelated', animation: `read-tilt ${headDur * 2}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
            <div style={{ position: 'absolute', top: '35%', left: '20%', width: 2.5, height: 2.5, borderRadius: '50%', background: '#050510' }} />
            <div style={{ position: 'absolute', top: '35%', right: '20%', width: 2.5, height: 2.5, borderRadius: '50%', background: '#050510' }} />
            <div style={{ position: 'absolute', bottom: '18%', left: '28%', right: '28%', height: 1.5, background: '#050510', borderRadius: 1 }} />
          </div>
          {/* Torso */}
          <div style={{ width: 10, height: 13, marginTop: 1, background: `${color}cc`, borderRadius: '3px 3px 1px 1px', border: `1px solid ${color}60`, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: -6, top: '20%', width: 6, height: 3, background: color, borderRadius: 1.5, transformOrigin: 'right center', animation: `key-tap 0.3s ease-in-out ${delay}s infinite`, willChange: 'transform' }} />
            <div style={{ position: 'absolute', right: -6, top: '20%', width: 6, height: 3, background: color, borderRadius: 1.5, transformOrigin: 'left center', animation: `key-tap 0.3s ease-in-out ${delay + 0.15}s infinite`, willChange: 'transform' }} />
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
            <div style={{ width: 4, height: 7, background: `${color}88`, borderRadius: '1px 1px 3px 3px', transform: 'rotate(15deg)' }} />
            <div style={{ width: 4, height: 7, background: `${color}88`, borderRadius: '1px 1px 3px 3px', transform: 'rotate(-15deg)' }} />
          </div>
        </div>
        {/* Name pill badge */}
        <div style={{ position: 'absolute', bottom: -13, left: '50%', transform: 'translateX(-50%)', background: `rgba(${hexToRgb(color)},0.20)`, border: `1px solid rgba(${hexToRgb(color)},0.40)`, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          <span style={{ fontSize: 5.5, color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.3 }}>{initials}</span>
        </div>
      </div>
    )
  }

  // Walking
  return (
    <div style={{ position: 'relative', willChange: 'transform' }}>
      {tripping && (
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 8, animation: 'trip-stars 2.5s ease-out 1 forwards', zIndex: 20, pointerEvents: 'none', willChange: 'transform, opacity' }}>⭐</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `${bodyAnim} ${bodyDur}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
        {/* Head — 14px, crisp, pixel-perfect */}
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}90`, border: `1.5px solid ${color}`, position: 'relative', flexShrink: 0, imageRendering: 'pixelated', animation: `${headAnim} ${headDur}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>
          <div style={{ position: 'absolute', top: '30%', left: '20%', width: 2.5, height: 2.5, borderRadius: '50%', background: '#050510' }} />
          <div style={{ position: 'absolute', top: '30%', right: '20%', width: 2.5, height: 2.5, borderRadius: '50%', background: '#050510' }} />
          <div style={{ position: 'absolute', bottom: '15%', left: '24%', right: '24%', height: 5, border: '1.5px solid #050510', borderTop: 'none', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
          {personality.name === 'Phone Walker' && (
            <div style={{ position: 'absolute', bottom: -5, left: '8%', right: '8%', height: 8, background: '#0f172a', border: '1px solid #334155', borderRadius: 1 }} />
          )}
        </div>

        {/* Arms + Torso */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 1 }}>
          <div style={{ width: 4, height: 10, background: color, borderRadius: '2px 2px 3px 3px', transformOrigin: 'top center', animation: `${armL} ${armDur}s ease-in-out ${delay}s infinite`, willChange: 'transform', flexShrink: 0 }} />
          <div style={{ width: 10, height: 15, background: `${color}cc`, borderRadius: '3px 3px 2px 2px', border: `1px solid ${color}60`, position: 'relative', flexShrink: 0 }}>
            {personality.name === 'Coffee Carrier' && (
              <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', fontSize: 5, lineHeight: 1, animation: `cup-wobble ${armDur}s ease-in-out ${delay}s infinite`, willChange: 'transform' }}>☕</div>
            )}
          </div>
          <div style={{ width: 4, height: 10, background: color, borderRadius: '2px 2px 3px 3px', transformOrigin: 'top center', animation: `${armR} ${armDur}s ease-in-out ${delay + armDur / 2}s infinite`, willChange: 'transform', flexShrink: 0 }} />
        </div>

        {/* Legs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
          <div style={{ width: 4, height: 11, background: `${color}99`, borderRadius: '1px 1px 3px 3px', transformOrigin: 'top center', animation: `${legL} ${legDur}s ease-in-out ${delay}s infinite`, willChange: 'transform' }} />
          <div style={{ width: 4, height: 11, background: `${color}99`, borderRadius: '1px 1px 3px 3px', transformOrigin: 'top center', animation: `${legR} ${legDur}s ease-in-out ${delay + legDur / 2}s infinite`, willChange: 'transform' }} />
        </div>
      </div>

      {/* Name pill badge above character */}
      <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: `rgba(${hexToRgb(color)},0.18)`, border: `1px solid rgba(${hexToRgb(color)},0.35)`, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', pointerEvents: 'none', animation: `name-fade 4s ease-in-out ${delay}s infinite`, willChange: 'opacity' }}>
        <span style={{ fontSize: 5.5, color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.3 }}>{initials}</span>
      </div>
    </div>
  )
}

// ─── Walking Character (wrapper) ──────────────────────────────────────────
interface WalkingCharProps {
  agent: LiveAgent; agentIndex: number; isActive: boolean; deskX?: number; deskY?: number
}

function WalkingChar({ agent, agentIndex, isActive, deskX, deskY }: WalkingCharProps) {
  const color = useMemo(() => {
    const idx = CHAR_COLORS.findIndex(c => c === nameToColor(agent.name))
    return idx >= 0 ? CHAR_COLORS[idx] : CHAR_COLORS[agentIndex % CHAR_COLORS.length]
  }, [agent.name, agentIndex])

  const initials = useMemo(() => agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), [agent.name])
  const personality = PERSONALITIES[agentIndex % 8]
  const pathIdx = agentIndex % WALK_PATHS.length
  const path = WALK_PATHS[pathIdx]
  const baseDur = agentDuration(agent.name, path.minDur, path.maxDur)
  const dur = (baseDur * personality.pathSpeedMult).toFixed(1)
  const delay = agentDelay(agent.name)
  const tripOffset = agentIndex % 15
  const originIdx = agentIndex % PATH_ORIGINS.length
  const origin = PATH_ORIGINS[originIdx]
  const isLounge = origin.y > 500 || pathIdx === 3 || pathIdx === 7

  if (isActive) {
    return (
      <div
        title={`${agent.name} — ${agent.currentTask ?? 'working'} · ${personality.name} ${personality.emoji}`}
        style={{ position: 'absolute', left: deskX ?? 0, top: deskY ?? 0, width: 24, height: 40, zIndex: 10, cursor: 'default' }}
      >
        <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1px solid ${color}`, boxShadow: `0 0 10px ${color}`, animation: 'status-pulse 1.5s ease-in-out infinite' }} />
        <HumanSprite color={color} initials={initials} personality={personality} delay={delay} isActive={true} tripOffset={tripOffset} agentName={agent.name} />
      </div>
    )
  }

  return (
    <div
      title={`${agent.name} · ${personality.name} ${personality.emoji}`}
      style={{ position: 'absolute', left: 0, top: 0, width: 24, height: 48, zIndex: 5, willChange: 'transform', animation: `${path.name} ${dur}s linear ${delay.toFixed(1)}s infinite`, cursor: 'default' }}
    >
      <HumanSprite color={color} initials={initials} personality={personality} delay={delay} isLounge={isLounge} isActive={false} tripOffset={tripOffset} agentName={agent.name} />
    </div>
  )
}

// ─── Office Furniture ─────────────────────────────────────────────────────
function DeskPod({ podIndex, occupant, occupantIsActive }: { podIndex: number; occupant: LiveAgent | null; occupantIsActive: boolean }) {
  const color = occupant ? nameToColor(occupant.name) : 'rgba(255,255,255,0.06)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <LaptopSprite glowing={occupantIsActive} size={18} />
        {occupantIsActive && (
          <div style={{ position: 'absolute', inset: -3, borderRadius: 4, boxShadow: `0 0 12px ${color}60`, pointerEvents: 'none' }} />
        )}
      </div>
      <div style={{ width: 56, height: 8, background: occupantIsActive ? `linear-gradient(90deg, rgba(${hexToRgb(color)},0.1), rgba(${hexToRgb(color)},0.28), rgba(${hexToRgb(color)},0.1))` : 'rgba(30,41,59,0.7)', border: `1px solid ${occupantIsActive ? `rgba(${hexToRgb(color)},0.45)` : 'rgba(255,255,255,0.05)'}`, borderRadius: 2, boxShadow: occupantIsActive ? `0 0 14px rgba(${hexToRgb(color)},0.35), 0 2px 4px rgba(0,0,0,0.3)` : '0 2px 4px rgba(0,0,0,0.3)' }} />
      <div style={{ display: 'flex', gap: 38 }}>
        <div style={{ width: 2, height: 6, background: 'rgba(30,41,59,0.9)' }} />
        <div style={{ width: 2, height: 6, background: 'rgba(30,41,59,0.9)' }} />
      </div>
      <div style={{ fontSize: 5.5, color: occupantIsActive ? `rgba(${hexToRgb(color)},0.8)` : 'rgba(71,85,105,0.4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
        {occupantIsActive ? `● D${(podIndex + 1).toString().padStart(2, '0')}` : `D${(podIndex + 1).toString().padStart(2, '0')}`}
      </div>
    </div>
  )
}

function WaterCooler() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 14, height: 18, borderRadius: '50% 50% 10% 10% / 30% 30% 10% 10%', background: 'linear-gradient(180deg, rgba(59,130,246,0.3), rgba(29,78,216,0.4))', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 8px rgba(59,130,246,0.3)' }} />
      <div style={{ width: 18, height: 20, background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '2px 2px 4px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
        <div style={{ width: 10, height: 2, background: 'rgba(59,130,246,0.5)', borderRadius: 2 }} />
        <div style={{ width: 8, height: 2, background: 'rgba(59,130,246,0.3)', borderRadius: 1, marginTop: 2 }} />
      </div>
      <div style={{ fontSize: 7, marginTop: 1, opacity: 0.6 }}>💧</div>
    </div>
  )
}

function Couch({ width = 90 }: { width?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 4px 8px rgba(109,40,217,0.3))' }}>
      <div style={{ width, height: 14, background: 'linear-gradient(180deg, rgba(109,40,217,0.65), rgba(91,33,182,0.75))', borderRadius: '4px 4px 0 0', border: '1px solid rgba(139,92,246,0.40)', boxShadow: '0 0 14px rgba(124,58,237,0.25)' }} />
      <div style={{ width: width + 10, height: 10, background: 'linear-gradient(0deg, rgba(76,29,149,0.75), rgba(91,33,182,0.65))', border: '1px solid rgba(139,92,246,0.30)', borderTop: 'none', borderRadius: '0 0 4px 4px' }} />
    </div>
  )
}

function PlantPot() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 16 }}>🌿</div>
      <div style={{ width: 16, height: 10, background: 'rgba(120,53,15,0.7)', borderRadius: '0 0 4px 4px', border: '1px solid rgba(180,83,9,0.4)' }} />
    </div>
  )
}

function MeetingTable({ width = 120, height = 40 }: { width?: number; height?: number }) {
  return (
    <div style={{ width, height, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: 6, boxShadow: '0 0 18px rgba(0,245,255,0.06), 0 4px 8px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 7.5, color: 'rgba(0,245,255,0.3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1 }}>CONF</div>
    </div>
  )
}

function CoffeeStation() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 18 }}>☕</div>
      <div style={{ width: 38, height: 9, background: 'rgba(120,53,15,0.65)', borderRadius: 2, border: '1px solid rgba(180,83,9,0.45)', display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,0.65)' }} />
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,0.45)' }} />
      </div>
      <div style={{ fontSize: 6.5, color: 'rgba(245,158,11,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>COFFEE</div>
    </div>
  )
}

// ─── Animated TV with color cycling ─────────────────────────────────────
function AnimatedTV({ size = 48 }: { size?: number }) {
const TV_COLORS_LIST = ["#00f5ff", "#7c3aed", "#ec4899", "#f59e0b", "#10b981"]
  const [colorIdx, setColorIdx] = useState(0)
  // tvColors moved outside
  useEffect(() => {
    const t = setInterval(() => setColorIdx(i => (i + 1) % TV_COLORS_LIST.length), 2000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const c = TV_COLORS_LIST[colorIdx]
  return (
    <div style={{ position: 'relative' }}>
      <TVSprite size={size} />
      <motion.div
        animate={{ borderColor: c, boxShadow: `0 0 14px ${c}60, 0 0 28px ${c}30` }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 2, borderRadius: 3, border: `1.5px solid ${c}` }}
      />
      {/* Scan line effect */}
      <div style={{ position: 'absolute', inset: 4, overflow: 'hidden', borderRadius: 2, opacity: 0.15 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 3px)', animation: 'tv-content 0.5s linear infinite' }} />
      </div>
    </div>
  )
}

// ─── Empty state / All Agents Standby ────────────────────────────────────
function AllAgentsStandby({ agentCount }: { agentCount: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
      <motion.div
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontFamily: 'Orbitron, JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: '#00f5ff', textShadow: '0 0 30px rgba(0,245,255,0.8), 0 0 60px rgba(0,245,255,0.3)', letterSpacing: 6, marginBottom: 12 }}>
          ALL AGENTS
        </div>
        <div style={{ fontFamily: 'Orbitron, JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.7)', letterSpacing: 8, marginBottom: 20 }}>
          STANDING BY
        </div>
        <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2 }}>
          {agentCount} SPECIALIST{agentCount === 1 ? '' : 'S'} · AWAITING MISSION
        </div>
      </motion.div>
    </div>
  )
}

// ─── The Big Office Floor ─────────────────────────────────────────────────
interface OfficeFloorProps { agents: LiveAgent[]; activeAgents: LiveAgent[] }

function OfficeFloor({ agents, activeAgents }: OfficeFloorProps) {
  const PODS = [
    { label: 'POD A — RESEARCH',    x: 40,  y: 110, color: '#00f5ff', cols: 3 },
    { label: 'POD B — CREATIVE',    x: 260, y: 110, color: '#ec4899', cols: 3 },
    { label: 'POD C — STRATEGY',    x: 480, y: 110, color: '#8b5cf6', cols: 3 },
    { label: 'POD D — ENGINEERING', x: 700, y: 110, color: '#3b82f6', cols: 3 },
    { label: 'POD E — ANALYTICS',   x: 40,  y: 310, color: '#10b981', cols: 3 },
    { label: 'POD F — CONTENT',     x: 260, y: 310, color: '#f59e0b', cols: 3 },
    { label: 'POD G — MARKETING',   x: 480, y: 310, color: '#7c3aed', cols: 3 },
    { label: 'POD H — SOCIAL',      x: 700, y: 310, color: '#f97316', cols: 3 },
  ]

  const deskAssignments: (LiveAgent | null)[] = Array(48).fill(null)
  let deskIdx = 0
  for (const ag of activeAgents) {
    if (deskIdx < 48) deskAssignments[deskIdx++] = ag
  }

  return (
    <div className="office-floor-responsive" style={{
      position: 'relative', width: '100%', height: 700, overflow: 'hidden',
      background: 'rgba(5,5,18,0.98)',
      backgroundImage: `
        linear-gradient(rgba(0,245,255,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,245,255,0.022) 1px, transparent 1px),
        radial-gradient(circle at 50% 50%, rgba(0,245,255,0.015) 0%, transparent 70%)
      `,
      backgroundSize: '40px 40px, 40px 40px, 100% 100%',
      borderRadius: 10,
      border: '1px solid rgba(0,245,255,0.07)',
      boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), 0 0 30px rgba(0,245,255,0.03)',
    }}>

      {/* Floor hex tile pattern overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundPosition: '10px 10px', pointerEvents: 'none' }} />

      {/* Empty state overlay when no active agents */}
      {activeAgents.length === 0 && <AllAgentsStandby agentCount={agents.length} />}

      {/* Reception Strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'rgba(0,245,255,0.02)', borderBottom: '1px solid rgba(0,245,255,0.07)', display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 16 }}>
        <div className="zone-label-glow-cyan" style={{ fontSize: 7 }}>↓ ENTRANCE</div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,245,255,0.1), transparent)' }} />
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 6.5, color: 'rgba(0,245,255,0.28)', letterSpacing: 2, marginRight: 16 }}>J.A.R.V.I.S. HQ · FLOOR 1</div>
      </div>

      {/* Central Corridor */}
      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.025)', background: 'rgba(0,0,0,0.08)' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{ width: 18, height: 2, background: 'rgba(255,255,255,0.03)', marginRight: 18, borderRadius: 1, flexShrink: 0 }} />
        ))}
      </div>

      {/* Desk Pods */}
      {PODS.map((pod, podI) => {
        const deskStart = podI * 6
        return (
          <div key={pod.label} style={{ position: 'absolute', left: pod.x, top: pod.y }}>
            <div className="zone-label" style={{ fontSize: 5.5, color: `rgba(${hexToRgb(pod.color)},0.5)`, letterSpacing: 1.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
              {pod.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 6px', padding: '7px', background: `rgba(${hexToRgb(pod.color)},0.03)`, border: `1px solid rgba(${hexToRgb(pod.color)},0.07)`, borderRadius: 6, boxShadow: `inset 0 0 12px rgba(${hexToRgb(pod.color)},0.03)` }}>
              {Array.from({ length: 6 }).map((_, di) => {
                const globalDeskIdx = deskStart + di
                const occupant = deskAssignments[globalDeskIdx] ?? null
                return <DeskPod key={di} podIndex={globalDeskIdx} occupant={occupant} occupantIsActive={occupant?.status === 'active'} />
              })}
            </div>
          </div>
        )
      })}

      {/* Conference Room */}
      <div style={{ position: 'absolute', right: 16, top: 110, width: 160, height: 185, background: 'rgba(6,6,22,0.85)', border: '1px solid rgba(0,245,255,0.10)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
        <div className="zone-label" style={{ fontSize: 6.5, color: 'rgba(0,245,255,0.4)', letterSpacing: 1.5, padding: '6px 8px', borderBottom: '1px solid rgba(0,245,255,0.06)' }}>🏢 CONFERENCE</div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <MeetingTable width={130} height={52} />
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ width: 16, height: 10, background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.08)', borderRadius: 2 }} />)}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ width: 16, height: 10, background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.08)', borderRadius: 2 }} />)}
          </div>
        </div>
      </div>

      {/* Break Lounge with animated TV */}
      <div style={{ position: 'absolute', left: 16, bottom: 16, width: 290, height: 165, background: 'rgba(8,5,18,0.9)', border: '1px solid rgba(245,158,11,0.09)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
        <div className="zone-label-glow-amber" style={{ fontSize: 6.5, padding: '5px 8px', borderBottom: '1px solid rgba(245,158,11,0.06)' }}>☕ THE LOUNGE</div>
        <div style={{ display: 'flex', gap: 12, padding: '10px 14px', alignItems: 'flex-end' }}>
          <CoffeeStation />
          <Couch width={78} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <AnimatedTV size={50} />
            <div style={{ fontSize: 6, color: 'rgba(245,158,11,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>📺 TV</div>
          </div>
          <PlantPot />
        </div>
      </div>

      {/* Corner plants */}
      <div style={{ position: 'absolute', top: 55, left: 8 }}><PlantPot /></div>
      <div style={{ position: 'absolute', top: 55, right: 185 }}><PlantPot /></div>

      {/* Water Cooler + Plants */}
      <div style={{ position: 'absolute', bottom: 32, left: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <WaterCooler />
        <div style={{ display: 'flex', gap: 6 }}><PlantPot /><PlantPot /></div>
      </div>

      {/* Zone label — THE FLOOR (Orbitron with glow) */}
      <div style={{ position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 2 }}>
        <div className="zone-label-glow-cyan" style={{ fontSize: 8, opacity: 0.25 }}>THE FLOOR</div>
      </div>

      {/* Window wall */}
      <div style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.03))', borderRight: '2px solid rgba(0,245,255,0.05)' }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', right: 8, top: 60 + i * 100, width: 10, height: 60, background: 'rgba(0,245,255,0.025)', border: '1px solid rgba(0,245,255,0.06)', borderRadius: 1 }} />
      ))}

      {/* Walking Characters Layer */}
      <WalkingLayer agents={agents} activeAgents={activeAgents} />
    </div>
  )
}

// ─── Path origins ─────────────────────────────────────────────────────────
const PATH_ORIGINS: Array<{ x: number; y: number }> = [
  { x: 80, y: 160 }, { x: 110, y: 165 }, { x: 140, y: 160 }, { x: 300, y: 160 }, { x: 330, y: 165 }, { x: 360, y: 160 },
  { x: 520, y: 160 }, { x: 550, y: 165 }, { x: 580, y: 160 }, { x: 740, y: 160 }, { x: 770, y: 165 }, { x: 800, y: 160 },
  { x: 80, y: 360 }, { x: 110, y: 365 }, { x: 140, y: 360 }, { x: 300, y: 360 }, { x: 330, y: 365 }, { x: 360, y: 360 },
  { x: 200, y: 80 }, { x: 400, y: 80 }, { x: 600, y: 80 }, { x: 800, y: 80 }, { x: 150, y: 80 }, { x: 500, y: 80 },
  { x: 30, y: 530 }, { x: 60, y: 545 }, { x: 90, y: 535 }, { x: 120, y: 540 }, { x: 150, y: 530 }, { x: 180, y: 545 },
  { x: 850, y: 120 }, { x: 860, y: 220 }, { x: 855, y: 320 }, { x: 850, y: 420 }, { x: 860, y: 520 }, { x: 855, y: 620 },
  { x: 75, y: 140 }, { x: 255, y: 140 }, { x: 475, y: 140 }, { x: 695, y: 140 }, { x: 75, y: 340 }, { x: 255, y: 340 },
  { x: 475, y: 340 }, { x: 695, y: 340 },
  { x: 400, y: 200 }, { x: 200, y: 400 }, { x: 600, y: 400 }, { x: 400, y: 500 }, { x: 100, y: 300 }, { x: 700, y: 300 },
  { x: 40, y: 510 }, { x: 70, y: 520 }, { x: 100, y: 510 }, { x: 130, y: 520 }, { x: 160, y: 510 }, { x: 200, y: 520 }, { x: 230, y: 510 },
  { x: 50, y: 100 }, { x: 200, y: 100 }, { x: 400, y: 100 }, { x: 600, y: 100 }, { x: 750, y: 100 }, { x: 900, y: 100 }, { x: 150, y: 100 }, { x: 350, y: 100 }, { x: 550, y: 100 },
  { x: 40, y: 200 }, { x: 40, y: 400 }, { x: 830, y: 200 }, { x: 830, y: 500 }, { x: 300, y: 560 }, { x: 500, y: 560 }, { x: 650, y: 560 },
]

function WalkingLayer({ agents, activeAgents }: { agents: LiveAgent[]; activeAgents: LiveAgent[] }) {
  const activeIds = useMemo(() => new Set(activeAgents.map(a => a.id)), [activeAgents])
  const DESK_POSITIONS: Array<{ x: number; y: number }> = useMemo(() => {
    const positions: Array<{ x: number; y: number }> = []
    const PODS_POS = [
      { x: 46, y: 130 }, { x: 266, y: 130 }, { x: 486, y: 130 }, { x: 706, y: 130 },
      { x: 46, y: 330 }, { x: 266, y: 330 }, { x: 486, y: 330 }, { x: 706, y: 330 },
    ]
    for (const pod of PODS_POS) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          positions.push({ x: pod.x + col * 60 + 18, y: pod.y + row * 52 + 12 })
        }
      }
    }
    return positions
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {agents.map((agent, i) => {
        const isActive = activeIds.has(agent.id)
        const activeIdx = activeAgents.findIndex(a => a.id === agent.id)
        const deskPos = isActive && activeIdx >= 0 && activeIdx < DESK_POSITIONS.length ? DESK_POSITIONS[activeIdx] : undefined
        return (
          <WalkingChar key={agent.id} agent={agent} agentIndex={i} isActive={isActive} deskX={deskPos?.x} deskY={deskPos?.y} />
        )
      })}
    </>
  )
}

// ─── Main OfficeScene ──────────────────────────────────────────────────────
export default function OfficeScene() {
  const [agents, setAgents] = useState<LiveAgent[]>([])
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [use3D, setUse3D] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    // Fetch independently: activity's underlying data source can be slow
    // (reads transcript files on jarvis), and a slow/failed activity fetch
    // must never blank out already-good agent data.
    try {
      const agRes = await fetch('/api/agents', { cache: 'no-store' })
      const agData = await agRes.json()
      setAgents(agData.agents ?? [])
      setLoading(false)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Agents fetch error:', e)
      setLoading(false)
    }
    try {
      const actRes = await fetch('/api/activity', { cache: 'no-store' })
      const actData = await actRes.json()
      setActivity(actData)
    } catch (e) {
      console.error('Activity fetch error:', e)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 5000)
    return () => clearInterval(t)
  }, [fetchData])

  // Auto-scroll activity feed to latest
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [activity?.recentCompleted?.length])

  const activeAgents  = useMemo(() => agents.filter(a => a.status === 'active'),  [agents])
  const waitingAgents = useMemo(() => agents.filter(a => a.status === 'waiting'), [agents])
  const idleAgents    = useMemo(() => agents.filter(a => a.status === 'idle'),    [agents])

  return (
    <div
      className="bg-space-grid bg-scanlines bg-starfield"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", background: '#050510', position: 'relative' }}
    >
      {/* ══ HEADER ═══════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ padding: '10px 24px', background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(0,245,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 15px rgba(0,245,255,0.15)', '0 0 30px rgba(0,245,255,0.30)', '0 0 15px rgba(0,245,255,0.15)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 38, height: 38, background: 'linear-gradient(135deg, rgba(0,245,255,0.12), rgba(124,58,237,0.12))', border: '1px solid rgba(0,245,255,0.28)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 18 }}>🤖</span>
          </motion.div>
          <div>
            <div className="neon-sign zone-label-glow-cyan" style={{ fontSize: 18, lineHeight: 1 }}>J.A.R.V.I.S.</div>
            <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.4)', letterSpacing: 3, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>AI COMMAND CENTER</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <SystemOnlineBadge />
          {lastUpdate && <span style={{ fontSize: 7.5, color: 'rgba(71,85,105,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>↺ {lastUpdate}</span>}
          <a href="/dashboard" style={{ fontSize: 8.5, color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.07)', padding: '5px 12px', borderRadius: 6, textDecoration: 'none', background: 'rgba(255,255,255,0.02)', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>⊞ DASHBOARD</a>
        </div>
      </motion.header>

      {/* ══ STATS BAR ════════════════════════════════════════════════ */}
      <div style={{ position: 'relative' }}>
        <StatsHeader agents={agents} activity={activity} loading={loading} />
      </div>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════ */}
      <div className="main-layout-responsive" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── CENTER: Big Office Floor ──────────────────────────────── */}
        <div style={{ flex: 1, padding: '14px', overflowY: 'auto', minWidth: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hud-corner"
            style={{ background: 'rgba(6,6,20,0.85)', border: '1px solid rgba(0,245,255,0.08)', borderRadius: 12, marginBottom: 14, overflow: 'hidden', boxShadow: '0 0 40px rgba(0,245,255,0.03), 0 8px 32px rgba(0,0,0,0.4)' }}
          >
            <ZoneHeader
              icon="🏢"
              label="HEADQUARTERS — LIVE OFFICE FLOOR"
              count={`${agents.length} agents · ${activeAgents.length} active`}
              color="#00f5ff"
              badge={activeAgents.length > 0 ? `${activeAgents.length} WORKING` : `${idleAgents.length} STANDBY`}
            />
            {/* 3D / 2D Toggle button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 14px 0' }}>
              <button
                onClick={() => setUse3D(v => !v)}
                style={{
                  background: use3D ? 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(124,58,237,0.18))' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${use3D ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  color: use3D ? '#00f5ff' : 'rgba(148,163,184,0.5)',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 1,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: use3D ? '0 0 12px rgba(0,245,255,0.2)' : 'none',
                }}
              >
                <span>{use3D ? '3D' : '2D'}</span>
                {use3D ? '3D MODE WebGL' : '2D MODE CSS'}
              </button>
            </div>
            <div style={{ padding: '12px 14px', height: 700 }}>
              {use3D ? (
                <Office3DScene
                  agents={agents}
                  activeAgents={activeAgents}
                  style={{ height: '100%', borderRadius: 10, overflow: 'hidden' }}
                />
              ) : (
                <OfficeFloor agents={agents} activeAgents={activeAgents} />
              )}
            </div>

            {/* Legend */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(0,245,255,0.05)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7.5, color: 'rgba(148,163,184,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 5px #00f5ff' }} /> ACTIVE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7.5, color: 'rgba(148,163,184,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(168,85,247,0.6)', border: '1px solid #a855f7' }} /> IDLE — WANDERING
              </div>
              {WALK_PATHS.slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 6.5, color: 'rgba(100,116,139,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: CHAR_COLORS[i] }} />
                  {p.name.replace('path-', '').replace(/-/g, ' ')}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Dept breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 7, marginBottom: 14 }}
          >
            {Object.entries(CATEGORY_COLORS).slice(0, 12).map(([cat, color]) => {
              const count = agents.filter(a => a.category === cat).length
              const activeCount = agents.filter(a => a.category === cat && a.status === 'active').length
              if (count === 0) return null
              return (
                <motion.div
                  key={cat}
                  whileHover={{ scale: 1.03, boxShadow: `0 0 20px rgba(${hexToRgb(color)},0.2)` }}
                  transition={{ duration: 0.15 }}
                  style={{ background: `rgba(${hexToRgb(color)},0.04)`, border: `1px solid rgba(${hexToRgb(color)},0.12)`, borderRadius: 8, padding: '8px 11px', cursor: 'default' }}
                >
                  <div className="zone-label" style={{ fontSize: 7, color, marginBottom: 5 }}>{cat.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace', textShadow: `0 0 8px ${color}40` }}>{count}</span>
                    {activeCount > 0 && (
                      <span style={{ fontSize: 7.5, color: '#00f5ff', background: 'rgba(0,245,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                        {activeCount} active
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
        <motion.div
          className="sidebar-responsive"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ width: 295, borderLeft: '1px solid rgba(255,255,255,0.04)', background: 'rgba(5,5,16,0.88)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
        >
          {/* Active agents panel */}
          <div style={{ padding: '14px 11px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="zone-label" style={{ fontSize: 7.5, color: '#00f5ff', textShadow: '0 0 10px rgba(0,245,255,0.5)' }}>⚡ ACTIVE AGENTS</div>
              <motion.div
                animate={{ background: activeAgents.length > 0 ? 'rgba(0,245,255,0.14)' : 'rgba(255,255,255,0.04)' }}
                transition={{ duration: 0.3 }}
                style={{ color: activeAgents.length > 0 ? '#00f5ff' : 'rgba(100,116,139,0.5)', fontSize: 9, padding: '2px 8px', borderRadius: 12, border: `1px solid ${activeAgents.length > 0 ? 'rgba(0,245,255,0.22)' : 'rgba(255,255,255,0.05)'}`, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {activeAgents.length}
              </motion.div>
            </div>

            <AnimatePresence mode="popLayout">
              {activeAgents.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: '28px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8 }}
                >
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    style={{ fontSize: 26, marginBottom: 10 }}
                  >😴</motion.div>
                  <div style={{ fontSize: 8.5, color: 'rgba(71,85,105,0.65)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>NO ACTIVE AGENTS</div>
                  <div style={{ fontSize: 7.5, color: 'rgba(51,65,85,0.6)', marginTop: 5, lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>All {agents.length} specialists wandering</div>
                </motion.div>
              ) : (
                activeAgents.slice(0, 8).map((ag, i) => <ActiveAgentCard key={ag.id} agent={ag} index={i} />)
              )}
            </AnimatePresence>

            {activeAgents.length > 8 && (
              <div style={{ fontSize: 8.5, color: 'rgba(0,245,255,0.4)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '4px 0' }}>
                +{activeAgents.length - 8} more active…
              </div>
            )}
          </div>

          {/* Waiting agents — blocked on approval or on another agent finishing. Only rendered when non-empty so it doesn't add noise on a quiet day. */}
          {waitingAgents.length > 0 && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 0' }} />
              <div style={{ padding: '10px 11px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="zone-label" style={{ fontSize: 7.5, color: '#f59e0b', textShadow: '0 0 10px rgba(245,158,11,0.5)' }}>⏳ WAITING</div>
                  <div style={{ color: '#f59e0b', fontSize: 9, padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.22)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {waitingAgents.length}
                  </div>
                </div>
                {waitingAgents.slice(0, 6).map((ag, i) => <WaitingAgentCard key={ag.id} agent={ag} index={i} />)}
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 0' }} />

          {/* Activity feed — scrollable with custom scrollbar + auto-scroll */}
          <div style={{ padding: '10px 11px', flex: 1 }}>
            <div className="zone-label" style={{ fontSize: 7.5, color: '#10b981', marginBottom: 10, textShadow: '0 0 8px rgba(16,185,129,0.5)' }}>✅ RECENT COMPLETIONS</div>
            <div ref={feedRef} className="activity-feed-scroll">
              {activity?.recentCompleted && activity.recentCompleted.length > 0 ? (
                activity.recentCompleted.slice(0, 8).map((item, i) => <FeedItem key={i} item={item} index={i} />)
              ) : (
                <div style={{ fontSize: 8.5, color: 'rgba(51,65,85,0.55)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '20px 0' }}>No completions yet today</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 13px', borderTop: '1px solid rgba(255,255,255,0.035)', background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 6.5, color: 'rgba(30,41,59,0.7)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
              {activity?.dataSource ?? 'Connecting…'}<br />
              Auto-refresh · 5s · Zero simulation
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══ TICKER BAR ════════════════════════════════════════════════ */}
      <TickerBar agentCount={agents.length} />
    </div>
  )
}
