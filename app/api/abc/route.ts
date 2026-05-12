export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin.rpc('get_abc_analysis', {
    period_start: from,
    period_end: to,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
