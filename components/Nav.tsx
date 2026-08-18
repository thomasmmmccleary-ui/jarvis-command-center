'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV_LINKS = [
  { href: '/',         label: 'Office',    icon: '🏢' },
  { href: '/team',     label: 'Team',      icon: '👥' },
  { href: '/tasks',    label: 'Tasks',     icon: '✅' },
  { href: '/calendar', label: 'Calendar',  icon: '📅' },
  { href: '/memory',   label: 'Memory',    icon: '🧠' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: '11px 24px',
        background: 'rgba(5,5,16,0.96)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,245,255,0.09)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <motion.div
          animate={{
            boxShadow: [
              '0 0 12px rgba(0,245,255,0.12)',
              '0 0 24px rgba(0,245,255,0.28)',
              '0 0 12px rgba(0,245,255,0.12)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            width: 34,
            height: 34,
            background:
              'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(124,58,237,0.1))',
            border: '1px solid rgba(0,245,255,0.22)',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15 }}>🤖</span>
        </motion.div>
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: 4,
              color: '#00f5ff',
              textShadow:
                '0 0 20px rgba(0,245,255,0.8), 0 0 40px rgba(0,245,255,0.25)',
              fontFamily: 'Orbitron, JetBrains Mono, monospace',
            }}
          >
            J.A.R.V.I.S.
          </div>
          <div
            style={{
              fontSize: 7,
              color: 'rgba(148,163,184,0.35)',
              letterSpacing: 2.5,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            COMMAND CENTER
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 13px',
                borderRadius: 7,
                textDecoration: 'none',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.2,
                fontFamily: 'JetBrains Mono, monospace',
                color: active ? '#00f5ff' : 'rgba(148,163,184,0.5)',
                background: active
                  ? 'rgba(0,245,255,0.07)'
                  : 'transparent',
                border: `1px solid ${active ? 'rgba(0,245,255,0.22)' : 'transparent'}`,
                transition: 'all 0.15s ease',
                boxShadow: active ? '0 0 10px rgba(0,245,255,0.1)' : 'none',
              }}
            >
              <span style={{ fontSize: 12 }}>{link.icon}</span>
              {link.label.toUpperCase()}
            </Link>
          )
        })}
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              animation: 'status-pulse 2s ease-in-out infinite',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 7.5,
            color: '#10b981',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 1.5,
          }}
        >
          ONLINE
        </span>
      </div>
    </motion.nav>
  )
}
