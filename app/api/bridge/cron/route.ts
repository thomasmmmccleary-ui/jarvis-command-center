import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BRIDGE_URL = 'https://marketing-wide-casual-reveal.trycloudflare.com'
const BRIDGE_TOKEN = 'QR3c6f6tXGpdAO9N1DTR1FiXe1J2MbuzDTArUi4vRr8'

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
