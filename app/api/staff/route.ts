export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyManagement, notifyStaff } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const type = searchParams.get('type')

  if (type === 'staff') {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('*, staff(*)')
    .eq('date', date)
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, ...data } = body

  if (type === 'staff') {
    const { data: staff, error } = await supabaseAdmin
      .from('staff')
      .insert(data)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(staff, { status: 201 })
  }

  // Создать смену
  const { data: shift, error } = await supabaseAdmin
    .from('shifts')
    .insert(data)
    .select('*, staff(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Уведомить сотрудника в Telegram
  if (shift.staff?.telegram_id) {
    await notifyStaff(
      shift.staff.telegram_id,
      `📅 <b>Ваша смена запланирована!</b>\n\n` +
      `📆 Дата: ${shift.date}\n` +
      `🕐 Время: ${shift.start_time} – ${shift.end_time}`
    )
  }

  return NextResponse.json(shift, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, type } = body

  if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 })

  if (type === 'checkin') {
    const { data: shift } = await supabaseAdmin
      .from('shifts')
      .select('*, staff(*)')
      .eq('id', id)
      .single()

    const now = new Date()
    const [hours, minutes] = shift.start_time.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const lateMinutes = Math.floor((now.getTime() - startDate.getTime()) / 60000)

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .update({ status: 'active', checked_in_at: now.toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (lateMinutes > 15) {
      await notifyManagement(
        `⚠️ <b>Опоздание!</b>\n\n` +
        `👤 ${shift.staff?.name}\n` +
        `⏱ Опоздал на ${lateMinutes} мин.\n` +
        `📅 Смена с ${shift.start_time}`
      )

      await supabaseAdmin.from('alerts').insert({
        type: 'staff_late',
        title: `Опоздание: ${shift.staff?.name}`,
        message: `${shift.staff?.name} опоздал на ${lateMinutes} минут`,
        metadata: { shift_id: id, late_minutes: lateMinutes },
      })
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
