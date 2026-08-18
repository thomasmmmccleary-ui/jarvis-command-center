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
    // Bridge returns { cron: [...] } — cron is a bare array. The calendar
    // page used to read data.cron?.jobs (a nested .jobs that never
    // existed), so it silently showed zero cron jobs even when jobs were
    // running. Normalize to a plain array here so the shape is unambiguous
    // on both the success and error paths.
    return NextResponse.json({ cron: Array.isArray(data.cron) ? data.cron : [] })
  } catch (err) {
    return NextResponse.json({ error: String(err), cron: [] }, { status: 500 })
  }
}
