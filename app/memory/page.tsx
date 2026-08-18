'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Nav from '@/components/Nav'

interface MemoryFile {
  file: string
  sizeBytes: number
  modifiedAt: string
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function fileColor(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('knowledge')) return '#00f5ff'
  if (lower.includes('mission')) return '#7c3aed'
  if (lower.includes('persona') || lower.includes('audience')) return '#ec4899'
  if (lower.includes('brand') || lower.includes('creative')) return '#f59e0b'
  if (lower.includes('research') || lower.includes('market')) return '#10b981'
  if (lower.includes('telemetry') || lower.includes('performance')) return '#f97316'
  const colors = ['#00f5ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']
  let hash = 0
  for (let i = 0; i < filename.length; i++) {
    hash = filename.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function renderMarkdownText(content: string): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `line-${i}`

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <div key={key} style={{ fontSize: 14, fontWeight: 800, color: '#00f5ff', margin: '14px 0 6px 0', fontFamily: 'Orbitron, monospace', letterSpacing: 1 }}>
          {line.slice(2)}
        </div>
      )
      continue
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <div key={key} style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', margin: '10px 0 4px 0', fontFamily: 'JetBrains Mono, monospace' }}>
          {line.slice(3)}
        </div>
      )
      continue
    }
    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <div key={key} style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', margin: '8px 0 3px 0', fontFamily: 'JetBrains Mono, monospace' }}>
          {line.slice(4)}
        </div>
      )
      continue
    }
    // Code block fence (skip the markers, style the block)
    if (line.startsWith('```')) {
      // find end
      let end = i + 1
      while (end < lines.length && !lines[end].startsWith('```')) end++
      const block = lines.slice(i + 1, end).join('\n')
      elements.push(
        <pre key={key} style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 8,
          color: '#10b981',
          fontFamily: 'JetBrains Mono, monospace',
          overflowX: 'auto',
          margin: '6px 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {block}
        </pre>
      )
      i = end
      continue
    }
    // Bullet
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key} style={{ fontSize: 9, color: 'rgba(226,232,240,0.7)', paddingLeft: 16, marginBottom: 2, lineHeight: 1.6, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 4, color: '#00f5ff' }}>·</span>
          {line.slice(2)}
        </div>
      )
      continue
    }
    // Bold **text**
    if (line.startsWith('**') && line.includes('**', 2)) {
      elements.push(
        <div key={key} style={{ fontSize: 9, color: 'rgba(226,232,240,0.85)', fontWeight: 600, marginBottom: 3, lineHeight: 1.6 }}>
          {line.replace(/\*\*(.*?)\*\*/g, '$1')}
        </div>
      )
      continue
    }
    // Separator
    if (line.match(/^-{3,}$/) || line.match(/^={3,}$/)) {
      elements.push(
        <div key={key} style={{ borderTop: '1px solid rgba(0,245,255,0.08)', margin: '8px 0' }} />
      )
      continue
    }
    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={key} style={{ height: 6 }} />)
      continue
    }
    // Normal text
    elements.push(
      <div key={key} style={{ fontSize: 9, color: 'rgba(148,163,184,0.7)', lineHeight: 1.65, marginBottom: 1 }}>
        {line}
      </div>
    )
  }

  return <>{elements}</>
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/bridge/memory', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setFiles(data.files ?? [])
        setError(null)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [])

  const handleSelectFile = async (file: string) => {
    setSelectedFile(file)
    setFileContent(null)
    setContentLoading(true)
    try {
      const res = await fetch(
        `/api/bridge/memory-content?file=${encodeURIComponent(file)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFileContent(data.content ?? '')
    } catch (err) {
      setFileContent(`Error loading file: ${err}`)
    } finally {
      setContentLoading(false)
    }
  }

  const filtered = files.filter((f) =>
    f.file.toLowerCase().includes(search.toLowerCase())
  )

  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0)

  return (
    <main style={{ minHeight: '100vh', background: '#050510', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(5,5,16,0.8)',
          flexShrink: 0,
        }}
      >
        {[
          { label: 'MEMORY FILES', value: files.length, color: '#7c3aed', icon: '🧠' },
          { label: 'TOTAL SIZE',   value: formatBytes(totalSize), color: '#00f5ff', icon: '💾' },
          { label: 'VIEWING',      value: selectedFile ? '1' : '—', color: '#10b981', icon: '📖' },
        ].map((s, i, arr) => (
          <div
            key={s.label}
            style={{
              padding: '12px 20px',
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, marginBottom: 3 }}>
              {s.icon} {s.label}
            </div>
            <div style={{
              fontSize: typeof s.value === 'number' ? 22 : 16,
              fontWeight: 900,
              color: s.color,
              fontFamily: 'JetBrains Mono, monospace',
              textShadow: `0 0 12px rgba(${hexToRgb(s.color)},0.4)`,
            }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* File list panel */}
        <div style={{
          width: 320,
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(0,245,255,0.12)',
                borderRadius: 7,
                padding: '7px 10px',
                fontSize: 9,
                color: '#e2e8f0',
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 9, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                Loading…
              </div>
            ) : error ? (
              <div style={{ padding: '12px', fontSize: 9, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
                ⚠ {error}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 9, color: 'rgba(100,116,139,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>
                No files found
              </div>
            ) : (
              filtered.map((f, i) => {
                const isSelected = selectedFile === f.file
                const color = fileColor(f.file)
                const shortName = f.file.split('/').pop() ?? f.file
                return (
                  <motion.div
                    key={f.file}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => handleSelectFile(f.file)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 7,
                      marginBottom: 3,
                      cursor: 'pointer',
                      background: isSelected
                        ? `rgba(${hexToRgb(color)},0.1)`
                        : 'transparent',
                      border: `1px solid ${isSelected ? `rgba(${hexToRgb(color)},0.25)` : 'transparent'}`,
                      borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                      transition: 'all 0.12s',
                    }}
                    whileHover={{ background: `rgba(${hexToRgb(color)},0.06)` }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 600, color: isSelected ? color : 'rgba(226,232,240,0.7)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                      {shortName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 7, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatBytes(f.sizeBytes)}
                      </span>
                      <span style={{ fontSize: 7, color: 'rgba(100,116,139,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {relativeTime(f.modifiedAt)}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedFile ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 40, opacity: 0.15 }}>🧠</div>
              <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.35)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5 }}>
                SELECT A FILE TO VIEW
              </div>
            </motion.div>
          ) : (
            <>
              {/* Content header */}
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#00f5ff', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedFile.split('/').pop()}
                  </div>
                  <div style={{ fontSize: 7.5, color: 'rgba(100,116,139,0.4)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                    {selectedFile}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedFile(null); setFileContent(null) }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(100,116,139,0.15)',
                    borderRadius: 6,
                    color: 'rgba(100,116,139,0.5)',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Content body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                <AnimatePresence mode="wait">
                  {contentLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        fontSize: 9,
                        color: 'rgba(100,116,139,0.4)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      Loading…
                    </motion.div>
                  ) : fileContent !== null ? (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {renderMarkdownText(fileContent)}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
