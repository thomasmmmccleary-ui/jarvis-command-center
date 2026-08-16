'use client'

import { useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { MissionFeed } from '@/components/MissionFeed'
import { ActiveWorkPanel } from '@/components/ActiveWorkPanel'
import { RecentActivity } from '@/components/RecentActivity'
import { useAgentStore } from '@/lib/store'

function SectionHeader({ title, badge }: { title: string; badge?: string | number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase">{title}</h2>
      {badge !== undefined && (
        <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {badge}
        </span>
      )}
    </div>
  )
}

function Panel({ title, badge, children }: { title: string; badge?: string | number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <SectionHeader title={title} badge={badge} />
      {children}
    </div>
  )
}

export default function Home() {
  const { startPolling, agents, activity } = useAgentStore()

  useEffect(() => {
    const cleanup = startPolling(10_000)
    return cleanup
  }, [startPolling])

  const activeCount = agents.filter(a => a.status === 'active').length
  const activeWorkCount = activity?.activeWork?.length ?? 0
  const todayMissions = activity?.today?.missionsRun ?? 0
  const completedToday = activity?.today?.completedMissions?.length ?? 0

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Stats bar */}
        <StatsBar />

        {/* Main grid: left=agents kanban, right=mission/activity panels */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">

          {/* LEFT COLUMN — Agent Roster */}
          <div className="space-y-5">
            <Panel title="Agent Roster" badge={`${agents.length} specialists`}>
              <KanbanBoard />
            </Panel>
          </div>

          {/* RIGHT COLUMN — Live Activity Feed */}
          <div className="space-y-4">

            {/* Active Work (what agents are doing RIGHT NOW) */}
            <Panel title="Active Work" badge={activeWorkCount > 0 ? activeWorkCount : undefined}>
              <ActiveWorkPanel />
            </Panel>

            {/* Today's Missions */}
            <Panel title="Today's Missions" badge={todayMissions > 0 ? `${todayMissions} run` : undefined}>
              <MissionFeed />
            </Panel>

            {/* Recent Completions */}
            <Panel title="Recent Completions" badge={completedToday > 0 ? `${completedToday} today` : undefined}>
              <RecentActivity />
            </Panel>

          </div>
        </div>

        {/* Data freshness footer */}
        {activity && (
          <p className="mt-4 text-right text-[10px] text-gray-800 font-mono">
            {activity.dataSource} · refreshes every 10s
          </p>
        )}
      </div>
    </main>
  )
}
