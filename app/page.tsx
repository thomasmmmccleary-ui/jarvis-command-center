'use client'

import { useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { useAgentStore } from '@/lib/store'
import { ALL_AGENTS } from '@/lib/agents'

export default function Home() {
  const { initAgents, startSimulation } = useAgentStore()

  useEffect(() => {
    initAgents(ALL_AGENTS)
    const cleanup = startSimulation()
    return cleanup
  }, [initAgents, startSimulation])

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsBar />
        <KanbanBoard />
      </div>
    </main>
  )
}
