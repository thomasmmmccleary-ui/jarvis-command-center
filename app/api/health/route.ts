import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

// Cheap, dedicated health check — used by the shared Nav bar's "LIVE" badge
// so it reflects whether the bridge is actually reachable right now, rather
// than being a hardcoded green label (which is what it was before: always
// "LIVE" even during a real outage).
export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/health`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`Bridge /api/health returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ online: true, ...data })
  } catch (err) {
    return NextResponse.json(
      { online: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    )
  }
}
