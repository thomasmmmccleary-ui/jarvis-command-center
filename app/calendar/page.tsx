'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Nav from '@/components/Nav'

interface CronJob {
  id: string
  name: string
  enabled: boolean
  schedule: {
    kind: string
    expr: string
  }
  state: {
    nextRunAtMs?: number
    lastRunAtMs?: number
    lastRunStatus?: string
    lastDurationMs?: number
  }
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function relativeTime(ms: number | undefined): string {
  if (!ms) return '—'
  const diff = Date.now() - ms
  if (Math.abs(diff) < 60_000) return 'just now'
  if (diff > 0) {
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  } else {
    const ahead = Math.abs(diff)
    if (ahead < 60_000) return 'in <1m'
    if (ahead < 3_600_000) return `in ${Math.floor(ahead / 60_000)}m`
    if (ahead < 86_400_000) return `in ${Math.floor(ahead / 3_600_000)}h`
    return `in ${Math.floor(ahead / 86_400_000)}d`
  }
}

function humanizeCron(expr: string): string {
  try {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return expr

    const [min, hour, dom, , dow] = parts

    const pad = (n: string) => n.padStart(2, '0')

    // Every minute
    if (expr === '* * * * *') return 'Every minute'

    // Specific time — daily/weekly
    if (min !== '*' && hour !== '*' && !min.includes(',') && !hour.includes(',')) {
      const timeStr = `${pad(hour)}:${pad(min)} UTC`

      if (dom === '*' && dow === '*') return `Daily at ${timeStr}`

      if (dom === '*' && dow !== '*') {
        const days: Record<string, string> = {
          '0': 'Sunday', '1': 'Monday', '2': 'Tuesday',
          '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
          '7': 'Sunday',
        }
        return `Every ${days[dow] ?? `day ${dow}`} at ${timeStr}`
      }

      if (dom !== '*') return `Day ${dom} of month at ${timeStr}`
    }

    // Interval patterns
    if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`
    if (hour.startsWith('*/') && min === '0') return `Every ${hour.slice(2)} hours`

    return expr
  } catch {
    return expr
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function JobCard({ job, idx }: { job: CronJob; idx: number }) {
  const enabled = job.enabled
  const statusOk = job.state.lastRunStatus === 'ok' || job.state.lastRunStatus === 'success'
  const statusFailed =
    job.state.lastRunStatus && !statusOk && job.state.lastRunStatus !== 'pending'

  const accentColor = !enabled
    ? '#64748b'
    : statusFailed
    ? '#ef4444'
    : '#10b981'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      whileHover={{ scale: 1.012, boxShadow: `0 0 18px rgba(${hexToRgb(accentColor)},0.15)` }}
      style={{
        background: `rgba(${hexToRgb(accentColor)},0.04)`,
        border: `1px solid rgba(${hexToRgb(accentColor)},0.16)`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 11,
        padding: '14px 16px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: enabled ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.45)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: 3,
            }}
          >
            {job.name}
          </div>
          <div
            style={{
              fontSize: 9,
              color: accentColor,
              fontFamily: 'JetBrains Mono, monospace',
              opacity: 0.8,
            }}
          >
            {humanizeCron(job.schedule.expr)}
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: 'rgba(100,116,139,0.4)',
              fontFamily: 'JetBrains Mono, monospace',
              marginTop: 2,
            }}
          >
            {job.schedule.expr}
          </div>
        </div>

        {/* Enabled badge */}
        <span
          style={{
            fontSize: 7.5,
            background: enabled
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(100,116,139,0.08)',
            color: enabled ? '#10b981' : '#64748b',
            padding: '3px 9px',
            borderRadius: 6,
            border: `1px solid ${enabled ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.15)'}`,
            fontFamily: 'JetBrains Mono, monospace',
            flexShrink: 0,
          }}
        >
          {enabled ? '● ENABLED' : '○ DISABLED'}
        </span>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '10px 0 0 0',
          borderTop: `1px solid rgba(${hexToRgb(accentColor)},0.09)`,
        }}
      >
        {[
          {
            label: 'LAST RUN',
            value: relativeTime(job.state.lastRunAtMs),
            subValue: job.state.lastRunStatus
              ? job.state.lastRunStatus.toUpperCase()
              : '—',
            statusColor: statusFailed
              ? '#ef4444'
              : statusOk
              ? '#10b981'
              : 'rgba(100,116,139,0.5)',
          },
          {
            label: 'NEXT RUN',
            value: relativeTime(job.state.nextRunAtMs),
            subValue: job.state.nextRunAtMs
              ? new Date(job.state.nextRunAtMs).toLocaleTimeString()
              : '—',
            statusColor: enabled ? '#00f5ff' : 'rgba(100,116,139,0.3)',
          },
          {
            label: 'DURATION',
            value: formatDuration(job.state.lastDurationMs),
            subValue: 'last run',
            statusColor: 'rgba(100,116,139,0.4)',
          },
        ].map((stat) => (
          <div key={stat.label}>
            <div
              style={{
                fontSize: 7,
                color: 'rgba(100,116,139,0.4)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 1.5,
                marginBottom: 3,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: stat.statusColor,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 7.5,
                color: 'rgba(100,116,139,0.35)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {stat.subValue}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/bridge/cron', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setJobs(data.cron?.jobs ?? [])
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    const timer = setInterval(fetchJobs, 30_000)
    return () => clearInterval(timer)
  }, [])

  const enabled = jobs.filter((j) => j.enabled).length
  const nextJob = jobs
    .filter((j) => j.enabled && j.state.nextRunAtMs && j.state.nextRunAtMs > Date.now())
    .sort((a, b) => (a.state.nextRunAtMs ?? 0) - (b.state.nextRunAtMs ?? 0))[0]

  return (
    <main style={{ minHeight: '100vh', background: '#050510' }}>
      <Nav />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(5,5,16,0.8)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent, #00f5ff 20%, #7c3aed 50%, #10b981 80%, transparent)',
            opacity: 0.4,
          }}
        />
        {[
          { label: 'TOTAL JOBS',  value: jobs.length, color: '#7c3aed', icon: '📅' },
          { label: 'ENABLED',     value: enabled,      color: '#10b981', icon: '✅' },
          { label: 'NEXT JOB IN', value: nextJob ? relativeTime(nextJob.state.nextRunAtMs) : '—', color: '#00f5ff', icon: '⏱' },
        ].map((s, i, arr) => (
          <div
            key={s.label}
            style={{
              padding: '14px 20px',
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
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
                fontSize: typeof s.value === 'number' ? 26 : 18,
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

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px' }}>
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
              CRON SCHEDULE
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
              {jobs.length} SCHEDULED JOBS · UPDATES EVERY 30s
              {lastUpdated && ` · LAST: ${lastUpdated}`}
            </p>
          </div>
          {error && (
            <span
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
            </span>
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
            Loading schedule…
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'rgba(100,116,139,0.35)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              border: '1px dashed rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}
          >
            No cron jobs configured
          </motion.div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 14,
            }}
          >
            {jobs.map((job, i) => (
              <JobCard key={job.id} job={job} idx={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
