'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAgentStore } from '@/lib/store'

export function Navbar() {
  const { agents, activity } = useAgentStore()
  const activeCount = agents.filter(a => a.status === 'active').length
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const update = () =>
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const activeTask = activity?.activeWork?.[0]?.task?.slice(0, 60)

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-8 h-8 rounded-lg bg-active/20 border border-active/40 flex items-center justify-center shrink-0"
              animate={{ borderColor: ['rgba(99,102,241,0.4)', 'rgba(99,102,241,0.8)', 'rgba(99,102,241,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-active">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest font-mono leading-none">J.A.R.V.I.S.</h1>
              <p className="text-[10px] text-gray-500 tracking-wider">COMMAND CENTER</p>
            </div>
          </div>

          {/* Center — current activity ticker */}
          <div className="hidden lg:flex items-center gap-2 max-w-md">
            <motion.div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeCount > 0 ? 'bg-active' : 'bg-gray-600'}`}
              animate={activeCount > 0 ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs text-gray-500 font-mono truncate">
              {activeCount > 0
                ? activeTask
                  ? `${activeTask}…`
                  : `${activeCount} AGENT${activeCount !== 1 ? 'S' : ''} ACTIVE`
                : 'STANDBY — NO ACTIVE AGENTS'}
            </span>
          </div>

          {/* Right — clock */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-mono text-gray-500">{timeStr}</p>
              <p className="text-[10px] text-gray-700">UTC</p>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-active/10 border border-active/20">
              <span className="text-[11px] font-mono text-active font-semibold">
                {activeCount > 0 ? `${activeCount} LIVE` : 'IDLE'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}
