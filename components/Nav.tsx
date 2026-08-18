'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/'        , label: 'Office',   icon: '🏢' },
  { href: '/team'    , label: 'Team'    , icon: '👥' },
  { href: '/tasks'   , label: 'Tasks'   , icon: '✅' },
  { href: '/missions', label: 'Missions', icon: '🔗' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/memory'  , label: 'Memory'  , icon: '🧠' },
]

function pad(n: number) { return String(n).padStart(2, '0') }

export default function Nav() {
  const pathname = usePathname()
  const [clock, setClock] = useState('' )
  // Was a hardcoded green "LIVE" label with no data behind it — stayed
  // green through real bridge outages. Now backed by an actual health
  // check against the bridge, polled independently of whatever each page
  // is separately fetching.
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = await res.json()
        setOnline(data.online === true)
      } catch {
        setOnline(false)
      }
    }
    checkHealth()
    const id = setInterval(checkHealth, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: '0 24px',
        height: 56,
        background: 'rgba(5,5,16,0.96)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,245,255,0.09)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 }}>
        <motion.div
          animate={{ boxShadow: ['0 0 10px rgba(0,245,255,0.12)', '0 0 24px rgba(0,245,255,0.32)', '0 0 10px rgba(0,245,255,0.12)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: 32, height: 32, background: 'linear-gradient(135deg,rgba(0,245,255,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontSize: 14 }}>🤖</span>
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 3, color: '#00f5ff', textShadow: '0 0 18px rgba(0,245,255,0.7), 0 0 36px rgba(0,245,255,0.2)', fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>J.A.R.V.I.S.</div>
          <div style={{ fontSize: 7, color: 'rgba(148,163,184,0.3)', letterSpacing: 2.5, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>MISSION CONTROL</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6,
              textDecoration: 'none', fontSize: 9, fontWeight: 600, letterSpacing: 1.2,
              fontFamily: 'JetBrains Mono, monospace',
              color: active ? '#00f5ff' : 'rgba(148,163,184,0.45)',
              background: active ? 'rgba(0,245,255,0.06)' : 'transparent',
              border: '1px solid ' + (active ? 'rgba(0,245,255,0.2)' : 'transparent'),
              transition: 'all 0.15s ease',
            }}>
              <span style={{ fontSize: 11 }}>{link.icon}</span>
              {link.label.toUpperCase()}
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 180, justifyContent: 'flex-end' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00f5ff', letterSpacing: 1, minWidth: 90, textAlign: 'right' }}>
          {clock}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: online ? '#10b981' : '#ef4444', boxShadow: `0 0 6px ${online ? '#10b981' : '#ef4444'}` }}
          />
          <span style={{ fontSize: 8, color: online ? '#10b981' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5 }}>{online ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </motion.nav>
  )
}
