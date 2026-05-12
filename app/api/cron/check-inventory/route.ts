export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkAndOrderLowStock } from '@/bot/handlers/inventory'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await checkAndOrderLowStock()
  return NextResponse.json({ ok: true })
}
