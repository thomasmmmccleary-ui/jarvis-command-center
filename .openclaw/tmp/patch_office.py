#!/usr/bin/env python3

with open('/home/ubuntu/.openclaw/workspace/jarvis-command-center/components/OfficeScene.tsx', 'r') as f:\n    content = f.read()\n\n# Find the section to replace: from "// ─── Tiny Walking Character" through "// ─── Office Furniture: Desk Pod"
OLD_START = "// ─── Tiny Walking Character ───────────────────────────────────────────────\n// Pure CSS animated mini-person. No JS animation loop."
OLD_END   = "\n// ─── Office Furniture: Desk Pod ───────────────────────────────────────────"

start_idx = content.find(OLD_START)
end_idx   = content.find(OLD_END)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: start_idx={start_idx}, end_idx={end_idx}")
    exit(1)

print(f"Found section at {start_idx}–{end_idx}, replacing {end_idx - start_idx} chars")

NEW_SECTION = '''// ─── Personality types for walking characters ───────────────────────────
// 8 types assigned by agentIndex % 8. Each drives body/leg/arm/head anims.
interface PersonalityConfig {
  name: string
  emoji: string
  bodyAnim: string
  bodyDur: number
  legLeftAnim: string
  legRightAnim: string
  legDur: number
  armLeftAnim: string
  armRightAnim: string
  armDur: number
  headAnim: string
  headDur: number
  pathSpeedMult: number
}

const PERSONALITIES: PersonalityConfig[] = [
  // 0: The Speedwalker — arms pumping, leans forward, blazes past everyone
  {
    name: 'Speedwalker', emoji: '💨',
    bodyAnim: 'body-speedwalk', bodyDur: 0.25,
    legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.25,
    armLeftAnim: 'arm-left-pump',  armRightAnim: 'arm-right-pump',   armDur: 0.25,
    headAnim: 'head-tilt-normal', headDur: 0.25,
    pathSpeedMult: 0.55,
  },
  // 1: The Shuffler — classic Monday morning, barely lifts feet
  {
    name: 'Shuffler', emoji: '😴',
    bodyAnim: 'body-shuffle', bodyDur: 1.2,
    legLeftAnim: 'leg-left-shuffle', legRightAnim: 'leg-right-shuffle', legDur: 1.2,
    armLeftAnim: 'arm-left-stoic',   armRightAnim: 'arm-right-stoic',   armDur: 1.2,
    headAnim: 'head-tilt-normal', headDur: 2.0,
    pathSpeedMult: 1.6,
  },
  // 2: The Bouncer — very springy, exaggerated up-down on every step
  {
    name: 'Bouncer', emoji: '🏀',
    bodyAnim: 'body-bounce', bodyDur: 0.4,
    legLeftAnim: 'leg-left-bounce', legRightAnim: 'leg-right-bounce', legDur: 0.4,
    armLeftAnim: 'arm-left-normal', armRightAnim: 'arm-right-normal', armDur: 0.4,
    headAnim: 'head-tilt-normal', headDur: 0.4,
    pathSpeedMult: 0.9,
  },
  // 3: The Stoic — perfectly upright, minimal movement, looks important
  {
    name: 'Stoic', emoji: '🧊',
    bodyAnim: 'body-stoic', bodyDur: 0.7,
    legLeftAnim: 'leg-left-stoic', legRightAnim: 'leg-right-stoic', legDur: 0.7,
    armLeftAnim: 'arm-left-stoic', armRightAnim: 'arm-right-stoic', armDur: 0.7,
    headAnim: 'head-tilt-normal', headDur: 1.5,
    pathSpeedMult: 0.95,
  },
  // 4: The Phone Walker — head down, slower, texting while walking
  {
    name: 'Phone Walker', emoji: '📱',
    bodyAnim: 'body-phone', bodyDur: 0.8,
    legLeftAnim: 'leg-left-shuffle', legRightAnim: 'leg-right-shuffle', legDur: 0.8,
    armLeftAnim: 'arm-left-phone',   armRightAnim: 'arm-right-phone',   armDur: 0.8,
    headAnim: 'head-tilt-phone', headDur: 0.8,
    pathSpeedMult: 1.2,
  },
  // 5: The Coffee Carrier — arms out front, careful careful careful
  {
    name: 'Coffee Carrier', emoji: '☕',
    bodyAnim: 'body-coffee', bodyDur: 0.65,
    legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.65,
    armLeftAnim: 'arm-left-coffee', armRightAnim: 'arm-right-coffee', armDur: 0.65,
    headAnim: 'head-tilt-normal', headDur: 0.65,
    pathSpeedMult: 1.1,
  },
  // 6: The Enthusiast — perky skip, fast, slightly chaotic energy
  {
    name: 'Enthusiast', emoji: '⚡',
    bodyAnim: 'body-enthusiast', bodyDur: 0.35,
    legLeftAnim: 'leg-left-bounce', legRightAnim: 'leg-right-bounce', legDur: 0.35,
    armLeftAnim: 'arm-left-pump',  armRightAnim: 'arm-right-pump',   armDur: 0.35,
    headAnim: 'head-tilt-normal', headDur: 0.35,
    pathSpeedMult: 0.65,
  },
  // 7: The Wanderer — easily distracted, head looks around
  {
    name: 'Wanderer', emoji: '🦋',
    bodyAnim: 'body-wander', bodyDur: 0.9,
    legLeftAnim: 'leg-left-normal', legRightAnim: 'leg-right-normal', legDur: 0.9,
    armLeftAnim: 'arm-left-normal', armRightAnim: 'arm-right-normal', armDur: 0.9,
    headAnim: 'head-wander', headDur: 2.5,
    pathSpeedMult: 1.3,
  },
]

// ─── Human Sprite ─────────────────────────────────────────────────────────
// A little office worker with head (eyes + smile), body, swinging arms, legs.
// isActive = sitting at desk (folded legs, typing arms, reading head tilt).
// isLounge = near TV/couch area (slow sway).
// Funny touches:
//   - tripOffset === 0 → this agent stumbles & recovers every ~45s
//   - isActive && just spawned → "!" exclaim bubble pops above head
interface HumanSpriteProps {
  color: string
  initials: string
  personality: PersonalityConfig
  delay: number
  isLounge?: boolean
  isActive?: boolean
  tripOffset?: number
}

function HumanSprite({
  color, initials, personality, delay, isLounge = false, isActive = false, tripOffset = 0,
}: HumanSpriteProps) {
  const [exclaiming, setExclaiming] = useState(false)
  const [tripping, setTripping] = useState(false)

  // Only 1-in-15 agents are trippers
  const isTripper = tripOffset === 0

  useEffect(() => {
    if (!isTripper) return
    // Stagger initial trip: 8–45 seconds after mount
    const firstDelay = 8000 + Math.floor(Math.random() * 37000)
    const tripDuration = 2500
    const tripInterval = 45000
    let loopId: ReturnType<typeof setInterval>
    const initTimer = setTimeout(() => {
      setTripping(true)
      setTimeout(() => setTripping(false), tripDuration)
      loopId = setInterval(() => {
        setTripping(true)
        setTimeout(() => setTripping(false), tripDuration)
      }, tripInterval)
    }, firstDelay)
    return () => {
      clearTimeout(initTimer)
      clearInterval(loopId)
    }
  }, [isTripper])

  // Exclaim on task assignment (when agent becomes active)
  useEffect(() => {
    if (!isActive) return
    const t = setTimeout(() => {
      setExclaiming(true)
      setTimeout(() => setExclaiming(false), 900)
    }, 500)
    return () => clearTimeout(t)
  }, [isActive])

  // Choose animation names based on mode
  const bodyAnim = isLounge ? 'body-lounge' : (tripping ? 'trip-recover' : personality.bodyAnim)
  const bodyDur  = isLounge ? 3.5 : (tripping ? 2.5 : personality.bodyDur)
  const legL     = isLounge ? 'arm-left-stoic'  : personality.legLeftAnim
  const legR     = isLounge ? 'arm-right-stoic' : personality.legRightAnim
  const legDur   = isLounge ? 3.5 : personality.legDur
  const armL     = isLounge ? 'arm-left-stoic'  : personality.armLeftAnim
  const armR     = isLounge ? 'arm-right-stoic' : personality.armRightAnim
  const armDur   = isLounge ? 3.5 : personality.armDur
  const headAnim = isLounge ? 'head-lounge-sway' : personality.headAnim
  const headDur  = isLounge ? 3.5 : personality.headDur

  // ── SITTING AT DESK ──────────────────────────────────────────────────────
  if (isActive) {
    return (
      <div style={{ position: 'relative', willChange: 'transform' }}>
        {exclaiming && (
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 900, color: '#fbbf24',
            textShadow: '0 0 6px #f59e0b',
            animation: 'exclaim-pop 0.9s ease-out 1 forwards',
            zIndex: 20, pointerEvents: 'none',
            willChange: 'transform, opacity',
          }}>!</div>
        )}
        {/* Seated body */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: `desk-sit-bob 0.4s ease-in-out ${delay}s infinite`,
          willChange: 'transform',
        }}>
          {/* Head */}
          <div style={{
            width: 11, height: 11, borderRadius: '50%',
            background: color, border: `1.5px solid ${color}`,
            boxShadow: `0 0 8px ${color}`,
            position: 'relative', flexShrink: 0,
            animation: `read-tilt ${headDur * 2}s ease-in-out ${delay}s infinite`,
            willChange: 'transform',
          }}>
            <div style={{ position: 'absolute', top: '38%', left: '22%', width: 2, height: 2, borderRadius: '50%', background: '#050510' }} />
            <div style={{ position: 'absolute', top: '38%', right: '22%', width: 2, height: 2, borderRadius: '50%', background: '#050510' }} />
            {/* Focused mouth: flat line */}
            <div style={{ position: 'absolute', bottom: '20%', left: '28%', right: '28%', height: 1.5, background: '#050510', borderRadius: 1 }} />
          </div>
          {/* Body */}
          <div style={{
            width: 8, height: 11, marginTop: 1,
            background: `${color}cc`, borderRadius: '3px 3px 1px 1px',
            border: `1px solid ${color}60`,
            position: 'relative', flexShrink: 0,
          }}>
            {/* Typing arms */}
            <div style={{
              position: 'absolute', left: -5, top: '20%',
              width: 5, height: 3, background: color, borderRadius: 1.5,
              transformOrigin: 'right center',
              animation: `key-tap 0.3s ease-in-out ${delay}s infinite`,
              willChange: 'transform',
            }} />
            <div style={{
              position: 'absolute', right: -5, top: '20%',
              width: 5, height: 3, background: color, borderRadius: 1.5,
              transformOrigin: 'left center',
              animation: `key-tap 0.3s ease-in-out ${delay + 0.15}s infinite`,
              willChange: 'transform',
            }} />
          </div>
          {/* Legs folded under */}
          <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
            <div style={{ width: 3, height: 6, background: `${color}88`, borderRadius: '1px 1px 3px 3px', transform: 'rotate(15deg)' }} />
            <div style={{ width: 3, height: 6, background: `${color}88`, borderRadius: '1px 1px 3px 3px', transform: 'rotate(-15deg)' }} />
          </div>
        </div>
      </div>
    )
  }

  // ── WALKING ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', willChange: 'transform' }}>
      {/* Trip stars */}
      {tripping && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8,
          animation: 'trip-stars 2.5s ease-out 1 forwards',
          zIndex: 20, pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}>⭐</div>
      )}
      {/* Outer body container: drives personality walk */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: `${bodyAnim} ${bodyDur}s ease-in-out ${delay}s infinite`,
        willChange: 'transform',
      }}>
        {/* Head */}
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}80`,
          position: 'relative', flexShrink: 0,
          animation: `${headAnim} ${headDur}s ease-in-out ${delay}s infinite`,
          willChange: 'transform',
        }}>
          {/* Eyes */}
          <div style={{ position: 'absolute', top: '33%', left: '22%', width: 2, height: 2, borderRadius: '50%', background: '#050510' }} />
          <div style={{ position: 'absolute', top: '33%', right: '22%', width: 2, height: 2, borderRadius: '50%', background: '#050510' }} />
          {/* Smile curve */}
          <div style={{
            position: 'absolute', bottom: '15%', left: '26%', right: '26%', height: 5,
            border: '1.5px solid #050510', borderTop: 'none',
            borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
          }} />
          {/* Phone walker: phone overlay on face */}
          {personality.name === 'Phone Walker' && (
            <div style={{
              position: 'absolute', bottom: -4, left: '8%', right: '8%', height: 7,
              background: '#0f172a', border: '1px solid #334155', borderRadius: 1,
            }} />
          )}
        </div>

        {/* Arms + Body row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 1 }}>
          {/* Left arm */}
          <div style={{
            width: 3, height: 8, background: color,
            borderRadius: '2px 2px 3px 3px',
            transformOrigin: 'top center',
            animation: `${armL} ${armDur}s ease-in-out ${delay}s infinite`,
            willChange: 'transform', flexShrink: 0,
          }} />
          {/* Torso */}
          <div style={{
            width: 8, height: 13,
            background: `${color}cc`,
            borderRadius: '3px 3px 2px 2px',
            border: `1px solid ${color}60`,
            position: 'relative', flexShrink: 0,
          }}>
            {personality.name === 'Coffee Carrier' && (
              <div style={{
                position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
                fontSize: 5, lineHeight: 1,
                animation: `cup-wobble ${armDur}s ease-in-out ${delay}s infinite`,
                willChange: 'transform',
              }}>☕</div>
            )}
          </div>
          {/* Right arm */}
          <div style={{
            width: 3, height: 8, background: color,
            borderRadius: '2px 2px 3px 3px',
            transformOrigin: 'top center',
            animation: `${armR} ${armDur}s ease-in-out ${delay + armDur / 2}s infinite`,
            willChange: 'transform', flexShrink: 0,
          }} />
        </div>

        {/* Legs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
          <div style={{
            width: 3, height: 9, background: `${color}99`,
            borderRadius: '1px 1px 3px 3px',
            transformOrigin: 'top center',
            animation: `${legL} ${legDur}s ease-in-out ${delay}s infinite`,
            willChange: 'transform',
          }} />
          <div style={{
            width: 3, height: 9, background: `${color}99`,
            borderRadius: '1px 1px 3px 3px',
            transformOrigin: 'top center',
            animation: `${legR} ${legDur}s ease-in-out ${delay + legDur / 2}s infinite`,
            willChange: 'transform',
          }} />
        </div>
      </div>

      {/* Initials name-tag: fades in/out subtly */}
      <div style={{
        position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)',
        fontSize: 5, color, whiteSpace: 'nowrap',
        fontFamily: 'JetBrains Mono, monospace',
        animation: `name-fade 4s ease-in-out ${delay}s infinite`,
        willChange: 'opacity', pointerEvents: 'none',
        maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis',
        textShadow: `0 0 4px ${color}80`,
      }}>
        {initials}
      </div>
    </div>
  )
}

// ─── WalkingChar wrapper ──────────────────────────────────────────────────
// Handles path animation container + delegates to HumanSprite.
interface WalkingCharProps {
  agent: LiveAgent
  agentIndex: number
  isActive: boolean
  deskX?: number
  deskY?: number
}

function WalkingChar({ agent, agentIndex, isActive, deskX, deskY }: WalkingCharProps) {
  const color = useMemo(() => {
    const idx = CHAR_COLORS.findIndex(c => c === nameToColor(agent.name))
    return idx >= 0 ? CHAR_COLORS[idx] : CHAR_COLORS[agentIndex % CHAR_COLORS.length]
  }, [agent.name, agentIndex])

  const initials = useMemo(() =>
    agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  , [agent.name])

  const personality  = PERSONALITIES[agentIndex % 8]
  const pathIdx      = agentIndex % WALK_PATHS.length
  const path         = WALK_PATHS[pathIdx]
  const baseDur      = agentDuration(agent.name, path.minDur, path.maxDur)
  const dur          = (baseDur * personality.pathSpeedMult).toFixed(1)
  const delay        = agentDelay(agent.name)
  // 1 in 15 agents is the designated tripper
  const tripOffset   = agentIndex % 15
  // Lounge: path 3/7 or origin y > 500
  const originIdx    = agentIndex % PATH_ORIGINS.length
  const origin       = PATH_ORIGINS[originIdx]
  const isLounge     = origin.y > 500 || pathIdx === 3 || pathIdx === 7

  if (isActive) {
    return (
      <div
        title={`${agent.name} — ${agent.currentTask ?? 'working'} · ${personality.name} ${personality.emoji}`}
        style={{
          position: 'absolute',
          left: deskX ?? 0,
          top: deskY ?? 0,
          width: 22,
          height: 36,
          zIndex: 10,
          cursor: 'default',
        }}
      >
        <div style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          border: `1px solid ${color}`,
          boxShadow: `0 0 8px ${color}`,
          animation: 'status-pulse 1.5s ease-in-out infinite',
        }} />
        <HumanSprite
          color={color} initials={initials}
          personality={personality} delay={delay}
          isActive={true} tripOffset={tripOffset}
        />
      </div>
    )
  }

  return (
    <div
      title={`${agent.name} · ${personality.name} ${personality.emoji}`}
      style={{
        position: 'absolute',
        left: 0, top: 0,
        width: 22, height: 44,
        zIndex: 5,
        willChange: 'transform',
        animation: `${path.name} ${dur}s linear ${delay.toFixed(1)}s infinite`,
        cursor: 'default',
      }}
    >
      <HumanSprite
        color={color} initials={initials}
        personality={personality} delay={delay}
        isLounge={isLounge} isActive={false}
        tripOffset={tripOffset}
      />
    </div>
  )
}
'''

new_content = content[:start_idx] + NEW_SECTION + OLD_END + content[end_idx + len(OLD_END):]

with open('/home/ubuntu/.openclaw/workspace/jarvis-command-center/components/OfficeScene.tsx', 'w') as f:\n    f.write(new_content)\n\nprint(f"Done! New file is {len(new_content)} chars (was {len(content)})")
