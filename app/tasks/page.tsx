'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Nav from '@/components/Nav'

interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  priority: 'high' | 'medium' | 'low'
  assignee?: string
  createdAt?: string
  updatedAt?: string
}

const COLUMNS: { id: Task['status']; label: string; color: string; icon: string }[] = [
  { id: 'backlog',     label: 'Backlog',     color: '#64748b', icon: '📋' },
  { id: 'in_progress', label: 'In Progress', color: '#00f5ff', icon: '⚡' },
  { id: 'review',      label: 'Review',      color: '#f59e0b', icon: '🔍' },
  { id: 'done',        label: 'Done',        color: '#10b981', icon: '✅' },
]

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#10b981',
}

const STATUS_ORDER: Task['status'][] = ['backlog', 'in_progress', 'review', 'done']

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function nextStatus(current: Task['status']): Task['status'] | null {
  const idx = STATUS_ORDER.indexOf(current)
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null
}

function TaskCard({
  task,
  onAdvance,
}: {
  task: Task
  onAdvance: (id: string) => void
}) {
  const pColor = PRIORITY_COLORS[task.priority] ?? '#64748b'
  const next = nextStatus(task.status)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(${hexToRgb(pColor)},0.15)`,
        borderLeft: `3px solid ${pColor}`,
        borderRadius: 9,
        padding: '10px 12px',
        marginBottom: 7,
        cursor: next ? 'pointer' : 'default',
      }}
      whileHover={next ? { scale: 1.015, boxShadow: `0 0 14px rgba(${hexToRgb(pColor)},0.15)` } : {}}
      onClick={() => next && onAdvance(task.id)}
      title={next ? `Click to move to ${next.replace('_', ' ')}` : 'Task complete'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: 'rgba(226,232,240,0.85)',
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {task.title}
        </span>
        <span
          style={{
            fontSize: 7,
            background: `rgba(${hexToRgb(pColor)},0.12)`,
            color: pColor,
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid rgba(${hexToRgb(pColor)},0.25)`,
            fontFamily: 'JetBrains Mono, monospace',
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}
        >
          {task.priority.toUpperCase()}
        </span>
      </div>

      {task.description && (
        <p
          style={{
            fontSize: 8.5,
            color: 'rgba(148,163,184,0.55)',
            margin: '0 0 6px 0',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {task.assignee ? (
          <span
            style={{
              fontSize: 7.5,
              color: 'rgba(100,116,139,0.5)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            👤 {task.assignee}
          </span>
        ) : (
          <span />
        )}
        {next && (
          <span
            style={{
              fontSize: 7,
              color: 'rgba(0,245,255,0.4)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            → {next.replace('_', ' ')}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function AddTaskForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: { title: string; description: string; priority: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,245,255,0.15)',
    borderRadius: 7,
    padding: '7px 10px',
    fontSize: 10,
    color: '#e2e8f0',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(0,245,255,0.04)',
        border: '1px solid rgba(0,245,255,0.18)',
        borderRadius: 10,
        padding: '12px',
        marginBottom: 10,
      }}
    >
      <input
        style={inputStyle}
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        style={{ ...inputStyle, marginTop: 7, resize: 'none', height: 54 }}
        placeholder="Description (optional)…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 7, marginTop: 7, alignItems: 'center' }}>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            flex: 1,
            cursor: 'pointer',
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          onClick={() => title.trim() && onAdd({ title: title.trim(), description, priority })}
          style={{
            background: 'rgba(0,245,255,0.1)',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: 7,
            color: '#00f5ff',
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          ADD
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: '1px solid rgba(100,116,139,0.2)',
            borderRadius: 7,
            color: 'rgba(100,116,139,0.5)',
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          CANCEL
        </button>
      </div>
    </motion.div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/bridge/tasks', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    const timer = setInterval(fetchTasks, 10_000)
    return () => clearInterval(timer)
  }, [])

  const handleAddTask = async (data: { title: string; description: string; priority: string }) => {
    const optimistic: Task = {
      id: `tmp-${Date.now()}`,
      title: data.title,
      description: data.description,
      status: 'backlog',
      priority: data.priority as Task['priority'],
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [optimistic, ...prev])
    setShowAddForm(false)

    try {
      const res = await fetch('/api/bridge/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'backlog' }),
      })
      if (res.ok) {
        await fetchTasks() // refresh to get real ID
      }
    } catch {
      // keep optimistic
    }
  }

  const handleAdvance = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const next = nextStatus(task.status)
    if (!next) return

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)))

    try {
      await fetch(`/api/bridge/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
    } catch {
      // revert on failure
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)))
    }
  }

  const tasksByStatus = (status: Task['status']) => tasks.filter((t) => t.status === status)

  return (
    <main style={{ minHeight: '100vh', background: '#050510' }}>
      <Nav />

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
              MISSION KANBAN
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
              {tasks.length} TASKS · CLICK CARD TO ADVANCE
              {lastUpdated && ` · LAST: ${lastUpdated}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {error && (
              <span
                style={{
                  fontSize: 9,
                  color: '#ef4444',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                ⚠ {error}
              </span>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: showAddForm
                  ? 'rgba(124,58,237,0.1)'
                  : 'rgba(0,245,255,0.08)',
                border: `1px solid ${showAddForm ? 'rgba(124,58,237,0.3)' : 'rgba(0,245,255,0.25)'}`,
                borderRadius: 8,
                color: showAddForm ? '#7c3aed' : '#00f5ff',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                padding: '7px 16px',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {showAddForm ? '✕ CANCEL' : '+ ADD TASK'}
            </button>
          </div>
        </div>

        {/* Add form (floats above backlog) */}
        <AnimatePresence>
          {showAddForm && (
            <div style={{ maxWidth: 340, marginBottom: 16 }}>
              <AddTaskForm
                onAdd={handleAddTask}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Kanban board */}
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
            Loading tasks…
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              alignItems: 'start',
            }}
          >
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.id)
              return (
                <div key={col.id}>
                  {/* Column header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      padding: '8px 12px',
                      background: `rgba(${hexToRgb(col.color)},0.05)`,
                      border: `1px solid rgba(${hexToRgb(col.color)},0.15)`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span>{col.icon}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 2,
                          color: col.color,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {col.label.toUpperCase()}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 8,
                        background: `rgba(${hexToRgb(col.color)},0.12)`,
                        color: col.color,
                        padding: '1px 7px',
                        borderRadius: 8,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ minHeight: 60 }}>
                    <AnimatePresence>
                      {colTasks.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{
                            textAlign: 'center',
                            padding: '24px 0',
                            fontSize: 8,
                            color: 'rgba(71,85,105,0.4)',
                            fontFamily: 'JetBrains Mono, monospace',
                            border: '1px dashed rgba(255,255,255,0.05)',
                            borderRadius: 8,
                          }}
                        >
                          Empty
                        </motion.div>
                      ) : (
                        colTasks.map((task) => (
                          <TaskCard key={task.id} task={task} onAdvance={handleAdvance} />
                        ))
                      )}
                    </AnimatePresence>
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
