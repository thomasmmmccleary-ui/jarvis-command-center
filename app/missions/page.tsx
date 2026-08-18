'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Nav from '@/components/Nav'
import type { ActivitySummary, MissionRecord, SessionEvent } from '@/app/api/activity/route'

// ─── Missions & Handoff Log ────────────────────────────────────────────────
// Every field rendered here comes straight from the bridge's
// /api/dashboard-summary (via /api/activity) — real mission/subagent
// records read from OpenClaw's own session transcripts, not simulated.
// This surfaces two things the rest of the dashboard only hints at:
//   1. The main → subagent delegation tree per mission (who handed work to
//      whom, and what happened to it) — "handoff history."
//   2. Real token totals per agent across today's missions, as a token-cost
//      proxy. There's no dollar figure anywhere in the bridge's data, and
//      inventing a $/token conversion here would be exactly the kind of
//      fabricated number this dashboard has spent multiple sessions ripping
//      out — so this shows tokens only, never a made-up cost.

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

const CHAR_COLORS = [
  '#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#f97316',
  '#3b82f6', '#ec4899', '#84cc16', '#14b8a6', '#8b5cf6',
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CHAR_COLORS[Math.abs(hash) % CHAR_COLORS.length]
}

function relativeTime(ts: string | null): string {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatDuration(ms?: number): string {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatTokens(t: number): string {
  if (t <= 0) return '0'
  if (t < 1000) return String(t)
  return `${(t / 1000).toFixed(1)}k`
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  running: { color: '#00f5ff', label: 'RUNNING' },
  done: { color: '#10b981', label: 'DONE' },
  failed: { color: '#ef4444', label: 'FAILED' },
  killed: { color: '#ef4444', label: 'KILLED' },
  unknown: { color: '#94a3b8', label: 'UNKNOWN' },
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown
  return (
    <span style={{
      fontSize: 7, fontWeight: 700, letterSpacing: 1, color: meta.color,
      background: `rgba(${hexToRgb(meta.color)},0.12)`,
      border: `1px solid rgba(${hexToRgb(meta.color)},0.3)`,
      borderRadius: 4, padding: '2px 6px', fontFamily: 'JetBrains Mono, monospace',
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

function SubagentRow({ event, index }: { event: SessionEvent; index: number }) {
  const color = colorForName(event.label)
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', marginLeft: 20, marginBottom: 4,
        background: 'rgba(255,255,255,0.02)',
        borderLeft: `2px solid ${color}`,
        borderRadius: 5,
      }}
    >
      <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>↳</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.label}
        </div>
        {event.request && (
          <div style={{ fontSize: 8, color: 'rgba(148,163,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {event.request}
          </div>
        )}
      </div>
      <span style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.6)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
        {formatTokens(event.tokens)} tok
      </span>
      <StatusPill status={event.status} />
    </motion.div>
  )
}

function MissionCard({ mission, index }: { mission: MissionRecord; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const color = colorForName(mission.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid rgba(${hexToRgb(color)},0.18)`,
        borderRadius: 9, marginBottom: 8, overflow: 'hidden',
      }}
    >
      <div
        onClick={() => mission.subagentCount > 0 && setExpanded(!expanded)}
        style={{
          padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: mission.subagentCount > 0 ? 'pointer' : 'default',
        }}
      >
        {mission.subagentCount > 0 && (
          <span style={{
            fontSize: 9, color: 'rgba(148,163,184,0.5)', width: 12, flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s',
          }}>▸</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Inter, sans-serif' }}>{mission.name}</span>
            <StatusPill status={mission.status} />
          </div>
          <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.55)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mission.goal}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ fontSize: 8, color: 'rgba(100,116,139,0.6)' }}>
            {mission.subagentCount > 0 ? `${mission.subagentCount} handoff${mission.subagentCount === 1 ? '' : 's'}` : 'solo'}
          </span>
          <span style={{ fontSize: 8, color: 'rgba(100,116,139,0.6)' }}>
            {formatTokens(mission.tokens)} tok · {formatDuration(mission.durationMs)}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && mission.subagentCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 10px 14px' }}>
              {mission.subagents.map((s, i) => <SubagentRow key={s.key} event={s} index={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Token usage by agent (real tokens only, no fabricated cost) ─────────
function TokensByAgent({ missions }: { missions: MissionRecord[] }) {
  const totals = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of missions) {
      map.set(m.name, (map.get(m.name) ?? 0) + m.tokens)
      for (const s of m.subagents) {
        map.set(s.label, (map.get(s.label) ?? 0) + s.tokens)
      }
    }
    return Array.from(map.entries())
      .filter(([, tokens]) => tokens > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [missions])

  const max = Math.max(...totals.map(([, t]) => t), 1)

  if (totals.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontSize: 9, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
        No token data for today yet
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 14px' }}>
      {totals.map(([name, tokens], i) => {
        const color = colorForName(name)
        return (
          <div key={name} style={{ marginBottom: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'rgba(226,232,240,0.75)', fontFamily: 'JetBrains Mono, monospace' }}>{name}</span>
              <span style={{ fontSize: 8.5, color, fontFamily: 'JetBrains Mono, monospace' }}>{formatTokens(tokens)}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(tokens / max) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                style={{ height: '100%', background: color, borderRadius: 3 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function MissionsPage() {
  const [data, setData] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'running' | 'done' | 'failed'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/activity', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ActivitySummary
        setData(json)
        setError(json.dataSource?.startsWith('error') ? json.dataSource : null)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const id = setInterval(fetchData, 8000)
    return () => clearInterval(id)
  }, [])

  const allMissions = useMemo(() => {
    if (!data) return []
    return [...data.today.activeMissions, ...data.today.completedMissions, ...data.today.failedMissions]
  }, [data])

  const filtered = useMemo(() => {
    if (filter === 'all') return allMissions
    if (filter === 'running') return allMissions.filter(m => m.status === 'running')
    if (filter === 'done') return allMissions.filter(m => m.status === 'done')
    return allMissions.filter(m => m.status === 'failed')
  }, [allMissions, filter])

  const totalHandoffs = allMissions.reduce((sum, m) => sum + m.subagentCount, 0)

  return (
    <main style={{ minHeight: '100vh', background: '#050510', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(5,5,16,0.8)', flexShrink: 0,
      }}>
        {[
          { label: 'MISSIONS TODAY', value: data?.today.missionsRun ?? 0, color: '#7c3aed', icon: '🎯' },
          { label: 'HANDOFFS', value: totalHandoffs, color: '#00f5ff', icon: '🔗' },
          { label: 'COMPLETED', value: data?.today.completedToday ?? 0, color: '#10b981', icon: '✅' },
          { label: 'FAILED', value: data?.today.failedToday ?? 0, color: '#ef4444', icon: '⚠' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '12px 20px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, marginBottom: 3 }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace', textShadow: `0 0 12px rgba(${hexToRgb(s.color)},0.4)` }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Mission list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 8, color: 'rgba(0,245,255,0.7)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, marginRight: 6 }}>
              🔗 HANDOFF LOG
            </span>
            {(['all', 'running', 'done', 'failed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
                  padding: '3px 9px', borderRadius: 5, cursor: 'pointer',
                  background: filter === f ? 'rgba(0,245,255,0.1)' : 'transparent',
                  border: `1px solid ${filter === f ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: filter === f ? '#00f5ff' : 'rgba(148,163,184,0.5)',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 9, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>
            ) : error ? (
              <div style={{ padding: '12px', fontSize: 9, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>⚠ {error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 9, color: 'rgba(100,116,139,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>No missions match this filter</div>
            ) : (
              filtered.map((m, i) => <MissionCard key={m.id} mission={m} index={i} />)
            )}
          </div>
        </div>

        {/* Token usage sidebar */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 8, color: 'rgba(245,158,11,0.8)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5 }}>
              🔢 TOKENS BY AGENT · TODAY
            </span>
            <div style={{ fontSize: 7, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              Real token counts only — no $ estimate is shown (no pricing data exists in the bridge yet)
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 9, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>
            ) : (
              <TokensByAgent missions={allMissions} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
