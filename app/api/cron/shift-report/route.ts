export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateShiftReport } from '@/lib/claude'
import { notifyManagement } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  // Vercel Cron security check
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const [{ data: reservations }, { data: lowStock }, { data: staff }, { data: abcData }] =
    await Promise.all([
      supabaseAdmin
        .from('reservations')
        .select('guest_name, guests_count, start_time, status')
        .eq('reservation_date', today),
      supabaseAdmin.from('low_stock_items').select('name, current_stock, min_stock, unit'),
      supabaseAdmin.from('current_shift_staff').select('name, role, status'),
      supabaseAdmin.rpc('get_abc_analysis').limit(5),
    ])

  const report = await generateShiftReport({
    reservations: reservations || [],
    lowStockItems: lowStock || [],
    staff: staff || [],
    topSales: abcData?.filter((i: Record<string, unknown>) => i.abc_class === 'A') || [],
  })

  await notifyManagement(`📊 <b>Отчёт смены — ${today}</b>\n\n${report}`)

  await supabaseAdmin.from('alerts').insert({
    type: 'shift_report',
    title: `Отчёт смены ${today}`,
    message: report,
  })

  return NextResponse.json({ ok: true })
}
