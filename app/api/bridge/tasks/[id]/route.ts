import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const BRIDGE_URL = process.env.BRIDGE_URL
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
  throw new Error('BRIDGE_URL and BRIDGE_TOKEN environment variables must be set')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const res = await fetch(`${BRIDGE_URL}/api/tasks/${params.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${BRIDGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Bridge PATCH /api/tasks/${params.id} returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
