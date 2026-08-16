'use client'

import { useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { useAgentStore } from '@/lib/store'

export default function Home() {
  const { startPolling } = useAgentStore()

  useEffect(() => {
    // Start polling real agent data; cleanup stops the interval on unmount
    const cleanup = startPolling(10_000)
    return cleanup
  }, [startPolling])

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
