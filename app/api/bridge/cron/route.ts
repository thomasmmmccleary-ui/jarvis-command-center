import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/cron`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Bridge /api/cron returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err), cron: { jobs: [] } }, { status: 500 })
  }
}
