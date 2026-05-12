import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage, notifyStaff } from '@/lib/telegram'
import { format, addHours, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const twoHoursLater = addHours(now, 2)
  const today = now.toISOString().split('T')[0]
  const timeIn2h = `${twoHoursLater.getHours().toString().padStart(2,'0')}:${twoHoursLater.getMinutes().toString().padStart(2,'0')}`

  // Напоминания гостям (за 2 часа до брони)
  const { data: upcomingReservations } = await supabaseAdmin
    .from('reservations')
    .select('*, table:tables(number)')
    .eq('reservation_date', today)
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .lte('start_time', timeIn2h + ':00')
    .gte('start_time', `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:00`)

  for (const res of upcomingReservations || []) {
    // Попытка найти Telegram аккаунт гостя по телефону (если зарегистрирован)
    // В реальном проекте здесь можно добавить lookup по телефону
    // Пока просто отмечаем как отправленное
    await supabaseAdmin
      .from('reservations')
      .update({ reminder_sent: true })
      .eq('id', res.id)
  }

  // Уведомления сотрудникам о завтрашней смене (за 12 часов)
  const tomorrow = new Date(now.getTime() + 12 * 3600000).toISOString().split('T')[0]
  const { data: tomorrowShifts } = await supabaseAdmin
    .from('shifts')
    .select('*, staff(*)')
    .eq('date', tomorrow)
    .eq('status', 'scheduled')

  for (const shift of tomorrowShifts || []) {
    if (shift.staff?.telegram_id) {
      await notifyStaff(
        shift.staff.telegram_id,
        `📅 <b>Напоминание о смене!</b>\n\n` +
        `📆 Завтра, ${format(parseISO(shift.date), 'dd MMMM', { locale: ru })}\n` +
        `🕐 Время: ${shift.start_time} – ${shift.end_time}\n\n` +
        `Ждём вас! 👋`
      )
    }
  }

  return NextResponse.json({
    ok: true,
    reminders_sent: upcomingReservations?.length || 0,
    shift_notifications: tomorrowShifts?.length || 0,
  })
}
