import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

export async function GET(request: NextRequest) {
  try {
    const file = request.nextUrl.searchParams.get('file')
    if (!file) return NextResponse.json({ error: 'file param required' }, { status: 400 })

    const res = await fetch(
      `${BRIDGE_URL}/api/memory/content?file=${encodeURIComponent(file)}`,
      {
        headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) throw new Error(`Bridge /api/memory/content returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err), content: '' }, { status: 500 })
  }
}
