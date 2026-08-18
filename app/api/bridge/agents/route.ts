import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BRIDGE_URL = 'https://marketing-wide-casual-reveal.trycloudflare.com'
const BRIDGE_TOKEN = 'QR3c6f6tXGpdAO9N1DTR1FiXe1J2MbuzDTArUi4vRr8'

async function bridgeFetch(path: string) {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Bridge ${path} returned ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const [agentsData, statusData] = await Promise.all([
      bridgeFetch('/api/agents'),
      bridgeFetch('/api/live-status'),
    ])

    const statuses: Record<string, { status: string; rawStatus: string; lastInteractionAt: string }> =
      statusData.agents ?? {}

    const agents = (agentsData.agents ?? []).map((a: { id: string; name: string; toolsProfile?: string }) => {
      const live = statuses[a.id]
      return {
        id: a.id,
        name: a.name,
        toolsProfile: a.toolsProfile,
        status: live?.status ?? 'idle',
        rawStatus: live?.rawStatus ?? '',
        lastInteractionAt: live?.lastInteractionAt ?? null,
      }
    })

    return NextResponse.json({ agents, fetchedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: String(err), agents: [], fetchedAt: new Date().toISOString() },
      { status: 500 }
    )
  }
}
