'use client'

import React, { useMemo, useEffect, useState } from 'react'

export type CharacterState = 'idle_walk' | 'idle_sit' | 'idle_tv' | 'idle_chat' | 'working' | 'stretching'

interface CharacterProps {
  name: string
  category: string
  state: CharacterState
  color?: string
  size?: number
  showLabel?: boolean
  task?: string
  tokens?: number
  contextPct?: number
  startedAt?: string
  className?: string
  style?: React.CSSProperties
}

// Deterministic color from agent name
function nameToColor(name: string): string {
  const colors = [
    '#06b6d4', // cyan
    '#a855f7', // purple
    '#22c55e', // green
    '#f59e0b', // amber
    '#f97316', // orange
    '#3b82f6', // blue
    '#ec4899', // pink
    '#84cc16', // lime
    '#14b8a6', // teal
    '#8b5cf6', // violet
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Get initials from name
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Category to emoji icon
function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
    Research: '🔍', Marketing: '📣', Creative: '🎨', Engineering: '⚙️',
    Analytics: '📊', Content: '✍️', Social: '📱', Strategy: '🎯',
    Education: '📚', Advertising: '📢', Operations: '🗂️', Platform: '🤖',
    Compliance: '⚖️', Partnerships: '🤝', PR: '📰', Memory: '🧠',
    SEO: '🔎', Sales: '💼',
  }
  return map[cat] ?? '🤖'
}

function ElapsedTime({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!startedAt) return
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime()
      const s = Math.floor(ms / 1000)
      if (s < 60) setElapsed(`${s}s`)
      else if (s < 3600) setElapsed(`${Math.floor(s / 60)}m`)
      else setElapsed(`${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [startedAt])

  return <span>{elapsed}</span>
}

// The pixel/CSS art character SVG
function CharacterSprite({
  color,
  state,
  size,
  initials,
}: {
  color: string
  state: CharacterState
  size: number
  initials: string
}) {
  const isWorking = state === 'working'
  const isTV = state === 'idle_tv'
  const isCouch = state === 'idle_sit'
  const isChat = state === 'idle_chat'
  const isWalk = state === 'idle_walk'

  const bodyAnim = isWorking ? 'office-char-working'
    : isTV ? 'office-char-tv'
    : isCouch ? 'office-char-couch'
    : isChat ? 'office-char-chat'
    : 'office-char-idle'

  return (
    <div
      className={bodyAnim}
      style={{
        width: size,
        height: size * 1.4,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Head */}
      <div
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: '50%',
          background: color,
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isWorking ? `0 0 12px ${color}` : `0 0 6px ${color}80`,
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        {/* Face */}
        <span style={{ fontSize: size * 0.16, fontWeight: 700, color: '#0a0a0f', lineHeight: 1 }}>
          {initials}
        </span>
        {/* Eyes */}
        <div style={{ position: 'absolute', top: '55%', left: '20%', width: 3, height: 3, borderRadius: '50%', background: '#0a0a0f' }} />
        <div style={{ position: 'absolute', top: '55%', right: '20%', width: 3, height: 3, borderRadius: '50%', background: '#0a0a0f' }} />
        {/* Smile - working gets determination expression */}
        {isWorking ? (
          <div style={{ position: 'absolute', bottom: '18%', left: '30%', right: '30%', height: 2, background: '#0a0a0f', borderRadius: 1 }} />
        ) : (
          <div style={{
            position: 'absolute', bottom: '15%', left: '25%', right: '25%', height: '8px',
            border: '2px solid #0a0a0f', borderTop: 'none',
            borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
          }} />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          width: size * 0.48,
          height: size * 0.45,
          background: `${color}cc`,
          borderRadius: '4px 4px 2px 2px',
          marginTop: 1,
          position: 'relative',
          flexShrink: 0,
          border: `1px solid ${color}60`,
        }}
      >
        {/* Arms */}
        {isWorking ? (
          <>
            {/* Typing arms */}
            <div
              className="finger-type"
              style={{
                position: 'absolute', left: -size*0.13, top: '15%',
                width: size * 0.15, height: 4, background: color,
                borderRadius: 2, transformOrigin: 'right center',
                animation: 'arm-type 0.3s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute', right: -size*0.13, top: '15%',
                width: size * 0.15, height: 4, background: color,
                borderRadius: 2, transformOrigin: 'left center',
                animation: 'arm-type 0.3s ease-in-out infinite 0.15s',
              }}
            />
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', left: -size*0.13, top: '20%', width: size * 0.16, height: 4, background: color, borderRadius: 2 }} />
            <div style={{ position: 'absolute', right: -size*0.13, top: '20%', width: size * 0.16, height: 4, background: color, borderRadius: 2 }} />
          </>
        )}

        {/* Category icon on shirt */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.14,
          opacity: 0.9,
        }}>
        </div>
      </div>

      {/* Legs */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <div
          style={{
            width: size * 0.18, height: size * 0.28, background: `${color}99`,
            borderRadius: '2px 2px 4px 4px',
            animation: isWalk || isChat ? 'left-leg 0.5s ease-in-out infinite' : 'none',
            transformOrigin: 'top center',
          }}
        />
        <div
          style={{
            width: size * 0.18, height: size * 0.28, background: `${color}99`,
            borderRadius: '2px 2px 4px 4px',
            animation: isWalk || isChat ? 'right-leg 0.5s ease-in-out infinite 0.25s' : 'none',
            transformOrigin: 'top center',
          }}
        />
      </div>

      {/* Status indicator dot */}
      {isWorking && (
        <div
          className="status-dot"
          style={{
            position: 'absolute', top: -4, right: -4, width: 8, height: 8,
            borderRadius: '50%', background: '#06b6d4',
            boxShadow: '0 0 6px #06b6d4',
          }}
        />
      )}
    </div>
  )
}

// Laptop/desk item SVG
function LaptopSprite({ glowing, size = 40 }: { glowing: boolean; size?: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Screen */}
      <div
        className={glowing ? 'screen-active' : ''}
        style={{
          width: size, height: size * 0.65,
          background: glowing ? '#06b6d4' : '#1f2937',
          borderRadius: '3px 3px 0 0',
          border: '2px solid #374151',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {glowing && (
          <div style={{
            width: '80%', height: '70%',
            background: 'linear-gradient(135deg, #0a4a5a 0%, #06b6d4 50%, #0a4a5a 100%)',
            borderRadius: 2, opacity: 0.8,
            fontSize: 6, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ▌▌▌▌▌
          </div>
        )}
      </div>
      {/* Base */}
      <div style={{
        width: size * 1.2, height: size * 0.1,
        background: '#374151', borderRadius: '0 0 3px 3px',
        marginLeft: -size * 0.1, border: '1px solid #4b5563',
      }} />
    </div>
  )
}

// TV sprite
function TVSprite({ size = 60 }: { size?: number }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: size, height: size * 0.65,
        background: '#0f172a', border: '3px solid #334155',
        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div
          className="screen-flicker"
          style={{
            width: '88%', height: '88%',
            background: 'linear-gradient(135deg, #1e3a5f, #0f4c75, #1e3a5f, #2c5364)',
            backgroundSize: '200% 200%',
            animation: 'screen-flicker 8s ease-in-out infinite, tv-content 4s ease infinite',
            borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#60a5fa', fontSize: 8, fontFamily: 'monospace',
          }}
        >
          📊
        </div>
      </div>
      {/* Stand */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 4, height: 8, background: '#334155' }} />
      </div>
      <div style={{ width: size * 0.5, height: 4, background: '#334155', margin: '0 auto', borderRadius: 2 }} />
    </div>
  )
}

export function AgentCharacter({
  name, category, state, size = 44, showLabel = true, task, tokens, contextPct, startedAt, className, style,
}: CharacterProps) {
  const color = useMemo(() => nameToColor(name), [name])
  const initials = useMemo(() => getInitials(name), [name])
  const icon = useMemo(() => categoryIcon(category), [category])

  return (
    <div
      className={className}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, ...style,
      }}
    >
      <CharacterSprite color={color} state={state} size={size} initials={initials} />

      {showLabel && (
        <div style={{
          maxWidth: 90, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 600, color: state === 'working' ? color : '#9ca3af',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 90,
          }}>
            {icon} {name}
          </div>
          {state === 'working' && task && (
            <div style={{
              fontSize: 7.5, color: '#6b7280', maxWidth: 90,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.slice(0, 30)}
            </div>
          )}
          {state === 'working' && startedAt && (
            <div style={{ fontSize: 7, color: color, opacity: 0.8 }}>
              ⏱ <ElapsedTime startedAt={startedAt} />
              {contextPct !== undefined && ` · ${contextPct}% ctx`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { LaptopSprite, TVSprite, nameToColor, getInitials, categoryIcon }
