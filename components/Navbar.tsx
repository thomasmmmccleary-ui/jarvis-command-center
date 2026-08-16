'use client'

import { motion } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

export function Navbar() {
  const { agents } = useAgentStore()
  const activeCount = agents.filter(a => a.status === 'active').length
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="scanline" />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-lg bg-active/20 border border-active/40 flex items-center justify-center"
              animate={{ borderColor: ['rgba(99,102,241,0.4)', 'rgba(99,102,241,0.8)', 'rgba(99,102,241,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-active">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest font-mono">J.A.R.V.I.S.</h1>
              <p className="text-xs text-gray-500 tracking-wider">COMMAND CENTER</p>
            </div>
          </div>

          {/* Center — live indicator */}
          <div className="hidden md:flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-active"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs text-gray-400 font-mono">
              {activeCount > 0 ? `${activeCount} AGENTS ACTIVE` : 'STANDBY'}
            </span>
          </div>

          {/* Right — clock + agent count */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-mono text-gray-500">{timeStr}</p>
              <p className="text-xs text-gray-600">UTC</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-active/10 border border-active/20">
              <span className="text-xs font-mono text-active font-semibold">
                {agents.length} SPECIALISTS
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
