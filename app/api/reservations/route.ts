import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyManagement } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('reservations')
    .select('*, table:tables(number, capacity)')
    .eq('reservation_date', date)
    .order('start_time')

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { guest_name, guest_phone, guests_count, reservation_date, start_time, duration_hours, notes } = body

  if (!guest_name || !guest_phone || !guests_count || !reservation_date || !start_time) {
    return NextResponse.json({ error: 'Не все обязательные поля заполнены' }, { status: 400 })
  }

  // Найти свободный стол
  const { data: tables } = await supabaseAdmin
    .from('tables')
    .select('*')
    .gte('capacity', guests_count)
    .eq('status', 'free')
    .order('capacity', { ascending: true })
    .limit(1)

  const table = tables?.[0]

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      guest_name,
      guest_phone,
      guests_count,
      table_id: table?.id || null,
      reservation_date,
      start_time,
      duration_hours: duration_hours || 2,
      status: 'confirmed',
      notes,
    })
    .select('*, table:tables(number, capacity)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (table) {
    await supabaseAdmin.from('tables').update({ status: 'reserved' }).eq('id', table.id)
  }

  if (guests_count >= 6) {
    await notifyManagement(
      `🔔 <b>Крупная бронь!</b>\n👤 ${guest_name} (${guest_phone})\n👥 ${guests_count} гостей\n📅 ${reservation_date} в ${start_time}`
    )
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, ...rest } = body

  if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('reservations')
    .select('*, table:tables(*)')
    .eq('id', id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status, ...rest })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'cancelled' && existing?.table_id) {
    await supabaseAdmin.from('tables').update({ status: 'free' }).eq('id', existing.table_id)

    if (existing.guests_count >= 6) {
      await notifyManagement(
        `⚠️ <b>Отмена крупной брони!</b>\n👤 ${existing.guest_name}\n👥 ${existing.guests_count} гостей\n📅 ${existing.reservation_date}`
      )
    }
  }

  return NextResponse.json(data)
}
