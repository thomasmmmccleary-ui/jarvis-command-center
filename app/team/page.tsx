'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Nav from '@/components/Nav'

interface BridgeAgent {
  id: string
  name: string
  toolsProfile?: string
  status: 'working' | 'idle' | 'waiting'
  rawStatus?: string
  lastInteractionAt?: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Platform:     '#00f5ff',
  Research:     '#7c3aed',
  Marketing:    '#f59e0b',
  Creative:     '#ec4899',
  Social:       '#3b82f6',
  Analytics:    '#10b981',
  Engineering:  '#f97316',
  Operations:   '#8b5cf6',
  Education:    '#14b8a6',
  Strategy:     '#d946ef',
  Content:      '#22c55e',
  Advertising:  '#ef4444',
  SEO:          '#0ea5e9',
  Memory:       '#a78bfa',
  PR:           '#fb923c',
  Partnerships: '#34d399',
  Sales:        '#fbbf24',
  Compliance:   '#94a3b8',
}

function getCategoryFromTools(toolsProfile?: string): string {
  if (!toolsProfile) return 'Platform'
  const p = toolsProfile.toLowerCase()
  if (p.includes('research') || p.includes('web')) return 'Research'
  if (p.includes('creative') || p.includes('design')) return 'Creative'
  if (p.includes('seo')) return 'SEO'
  if (p.includes('analytics')) return 'Analytics'
  if (p.includes('code') || p.includes('engineer')) return 'Engineering'
  return 'Platform'
}

function getStatusColor(status: string) {
  if (status === 'working') return '#00f5ff'
  if (status === 'waiting') return '#f59e0b'
  return 'rgba(71,85,105,0.5)'
}

function getStatusLabel(status: string) {
  if (status === 'working') return 'WORKING'
  if (status === 'waiting') return 'WAITING'
  return 'IDLE'
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function relativeTime(ts: string | null | undefined): string {
  if (!ts) return 'never'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function AgentCard({ agent, idx }: { agent: BridgeAgent; idx: number }) {
  const category = getCategoryFromTools(agent.toolsProfile)
  const catColor = CATEGORY_COLORS[category] ?? '#00f5ff'
  const statusColor = getStatusColor(agent.status)
  const initials = agent.name
    .split(/[\s-]/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const isActive = agent.status === 'working'
  const isWaiting = agent.status === 'waiting'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.01, duration: 0.25 }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 18px rgba(${hexToRgb(catColor)},0.18)` }}
      style={{
        background: isActive
          ? `rgba(${hexToRgb(catColor)},0.07)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid rgba(${hexToRgb(catColor)},${isActive ? '0.28' : isWaiting ? '0.16' : '0.07'})`,
        borderRadius: 10,
        padding: '11px 12px',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Active glow strip */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${catColor}, transparent)`,
            opacity: 0.6,
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `rgba(${hexToRgb(catColor)},0.12)`,
            border: `1.5px solid rgba(${hexToRgb(catColor)},0.35)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: catColor,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {initials}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: isActive ? catColor : 'rgba(226,232,240,0.75)',
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {agent.name}
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: `rgba(${hexToRgb(catColor)},0.45)`,
              fontFamily: 'JetBrains Mono, monospace',
              marginTop: 1,
            }}
          >
            {category}
          </div>
        </div>

        {/* Status dot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
              animation: isActive ? 'status-pulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
        </div>
      </div>

      {/* Last active */}
      <div
        style={{
          fontSize: 7,
          color: 'rgba(100,116,139,0.4)',
          fontFamily: 'JetBrains Mono, monospace',
          marginTop: 7,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 7,
            background: `rgba(${hexToRgb(statusColor)},0.1)`,
            color: statusColor,
            padding: '1px 6px',
            borderRadius: 4,
            border: `1px solid rgba(${hexToRgb(statusColor)},0.2)`,
          }}
        >
          {getStatusLabel(agent.status)}
        </span>
        <span>{relativeTime(agent.lastInteractionAt)}</span>
      </div>
    </motion.div>
  )
}

export default function TeamPage() {
  const [agents, setAgents] = useState<BridgeAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/bridge/agents', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAgents(data.agents ?? [])
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const timer = setInterval(fetchAgents, 5000)
    return () => clearInterval(timer)
  }, [])

  // Group by category
  const grouped: Record<string, BridgeAgent[]> = {}
  for (const agent of agents) {
    const cat = getCategoryFromTools(agent.toolsProfile)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(agent)
  }

  const working = agents.filter((a) => a.status === 'working').length
  const waiting = agents.filter((a) => a.status === 'waiting').length
  const idle = agents.filter((a) => a.status === 'idle').length

  return (
    <main style={{ minHeight: '100vh', background: '#050510' }}>
      <Nav />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(5,5,16,0.8)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent, #00f5ff 20%, #7c3aed 50%, #ec4899 80%, transparent)',
            opacity: 0.4,
          }}
        />
        {[
          { label: 'TOTAL AGENTS', value: agents.length, color: '#7c3aed', icon: '🤖' },
          { label: 'WORKING NOW',  value: working,        color: '#00f5ff', icon: '⚡' },
          { label: 'WAITING',      value: waiting,        color: '#f59e0b', icon: '⏳' },
          { label: 'IDLE',         value: idle,           color: '#64748b', icon: '💤' },
        ].map((s, i, arr) => (
          <div
            key={s.label}
            style={{
              padding: '14px 20px',
              textAlign: 'center',
              borderRight:
                i < arr.length - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
            }}
          >
            <div
              style={{
                fontSize: 7.5,
                color: 'rgba(100,116,139,0.5)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 1.5,
                marginBottom: 5,
              }}
            >
              {s.icon} {s.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: s.color,
                fontFamily: 'JetBrains Mono, monospace',
                textShadow: `0 0 14px rgba(${hexToRgb(s.color)},0.5)`,
              }}
            >
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '20px 24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#00f5ff',
                fontFamily: 'Orbitron, monospace',
                letterSpacing: 3,
                margin: 0,
                textShadow: '0 0 20px rgba(0,245,255,0.4)',
              }}
            >
              AGENT ROSTER
            </h1>
            <p
              style={{
                fontSize: 9,
                color: 'rgba(100,116,139,0.5)',
                fontFamily: 'JetBrains Mono, monospace',
                margin: '4px 0 0 0',
                letterSpacing: 1.5,
              }}
            >
              {agents.length} SPECIALISTS · UPDATES EVERY 5s
              {lastUpdated && ` · LAST: ${lastUpdated}`}
            </p>
          </div>
          {error && (
            <div
              style={{
                fontSize: 9,
                color: '#ef4444',
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                padding: '6px 12px',
                borderRadius: 6,
              }}
            >
              ⚠ {error}
            </div>
          )}
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'rgba(100,116,139,0.4)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          >
            Loading agent roster…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, catAgents]) => {
                const catColor = CATEGORY_COLORS[cat] ?? '#00f5ff'
                const activeInCat = catAgents.filter((a) => a.status === 'working').length
                return (
                  <div key={cat}>
                    {/* Category header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 16,
                          borderRadius: 2,
                          background: catColor,
                          boxShadow: `0 0 8px ${catColor}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 2.5,
                          color: catColor,
                          fontFamily: 'Orbitron, JetBrains Mono, monospace',
                          textShadow: `0 0 10px rgba(${hexToRgb(catColor)},0.5)`,
                        }}
                      >
                        {cat.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          background: `rgba(${hexToRgb(catColor)},0.1)`,
                          color: catColor,
                          padding: '1px 7px',
                          borderRadius: 8,
                          border: `1px solid rgba(${hexToRgb(catColor)},0.2)`,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {catAgents.length}
                        {activeInCat > 0 && ` · ${activeInCat} active`}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 1,
                          background: `linear-gradient(90deg, rgba(${hexToRgb(catColor)},0.18), transparent)`,
                        }}
                      />
                    </div>

                    {/* Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {catAgents.map((agent, i) => (
                        <AgentCard key={agent.id} agent={agent} idx={i} />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </main>
  )
}
