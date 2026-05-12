import { supabaseAdmin } from '@/lib/supabase'
import { notifyManagement, sendMessage } from '@/lib/telegram'
import { askAgent } from '@/lib/claude'
import { Reservation, Table } from '@/types'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

// Состояния диалога бронирования
interface ReservationSession {
  step: 'name' | 'phone' | 'date' | 'time' | 'guests' | 'duration' | 'confirm'
  data: Partial<{
    name: string
    phone: string
    date: string
    time: string
    guests: number
    duration: number
  }>
}

const sessions = new Map<number, ReservationSession>()

export function getSession(userId: number) {
  return sessions.get(userId)
}

export function startReservationSession(userId: number) {
  sessions.set(userId, { step: 'name', data: {} })
}

export function clearSession(userId: number) {
  sessions.delete(userId)
}

export async function handleReservationStep(
  userId: number,
  chatId: number,
  text: string
): Promise<boolean> {
  const session = sessions.get(userId)
  if (!session) return false

  switch (session.step) {
    case 'name':
      session.data.name = text
      session.step = 'phone'
      await sendMessage(chatId, '📞 Введите номер телефона:')
      break

    case 'phone':
      if (!/^[\d\s\+\-\(\)]{7,15}$/.test(text)) {
        await sendMessage(chatId, '❌ Неверный формат телефона. Попробуйте ещё раз:')
        return true
      }
      session.data.phone = text
      session.step = 'date'
      await sendMessage(chatId, '📅 Введите дату (например: 25.05.2025):')
      break

    case 'date':
      const dateParts = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
      if (!dateParts) {
        await sendMessage(chatId, '❌ Неверный формат даты. Используйте: ДД.ММ.ГГГГ')
        return true
      }
      session.data.date = `${dateParts[3]}-${dateParts[2].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`
      session.step = 'time'
      await sendMessage(chatId, '🕐 Введите время начала (например: 19:00):')
      break

    case 'time':
      if (!/^\d{1,2}:\d{2}$/.test(text)) {
        await sendMessage(chatId, '❌ Неверный формат времени. Используйте: ЧЧ:ММ')
        return true
      }
      session.data.time = text
      session.step = 'guests'
      await sendMessage(chatId, '👥 Количество гостей:')
      break

    case 'guests':
      const guests = parseInt(text)
      if (isNaN(guests) || guests < 1 || guests > 50) {
        await sendMessage(chatId, '❌ Введите корректное количество гостей (1-50):')
        return true
      }
      session.data.guests = guests
      session.step = 'duration'
      await sendMessage(chatId, '⏱ На сколько часов бронируем? (например: 2):')
      break

    case 'duration':
      const duration = parseFloat(text)
      if (isNaN(duration) || duration < 0.5 || duration > 8) {
        await sendMessage(chatId, '❌ Введите продолжительность от 0.5 до 8 часов:')
        return true
      }
      session.data.duration = duration
      session.step = 'confirm'

      const d = session.data
      const formattedDate = format(parseISO(d.date!), 'dd MMMM yyyy', { locale: ru })
      await sendMessage(
        chatId,
        `📋 <b>Подтвердите бронирование:</b>\n\n` +
        `👤 Имя: ${d.name}\n` +
        `📞 Телефон: ${d.phone}\n` +
        `📅 Дата: ${formattedDate}\n` +
        `🕐 Время: ${d.time}\n` +
        `👥 Гостей: ${d.guests}\n` +
        `⏱ Продолжительность: ${d.duration} ч.\n\n` +
        `Всё верно? Отправьте <b>да</b> для подтверждения или <b>нет</b> для отмены.`
      )
      break

    case 'confirm':
      if (text.toLowerCase() === 'да' || text.toLowerCase() === 'yes') {
        await createReservation(userId, chatId, session)
      } else {
        clearSession(userId)
        await sendMessage(chatId, '❌ Бронирование отменено. Введите /старт чтобы начать заново.')
      }
      break
  }

  sessions.set(userId, session)
  return true
}

async function createReservation(userId: number, chatId: number, session: ReservationSession) {
  const d = session.data

  // Найти свободный стол подходящей вместимости
  const { data: tables } = await supabaseAdmin
    .from('tables')
    .select('*')
    .gte('capacity', d.guests!)
    .eq('status', 'free')
    .order('capacity', { ascending: true })
    .limit(1)

  const table = tables?.[0] as Table | undefined

  const { data: reservation, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      guest_name: d.name,
      guest_phone: d.phone,
      guests_count: d.guests,
      table_id: table?.id || null,
      reservation_date: d.date,
      start_time: d.time + ':00',
      duration_hours: d.duration,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error || !reservation) {
    await sendMessage(chatId, '❌ Ошибка при создании бронирования. Попробуйте позже.')
    clearSession(userId)
    return
  }

  // Обновить статус стола
  if (table) {
    await supabaseAdmin
      .from('tables')
      .update({ status: 'reserved' })
      .eq('id', table.id)
  }

  const formattedDate = format(parseISO(d.date!), 'dd MMMM yyyy', { locale: ru })
  await sendMessage(
    chatId,
    `✅ <b>Бронирование подтверждено!</b>\n\n` +
    `📅 ${formattedDate} в ${d.time}\n` +
    `👥 ${d.guests} гостей\n` +
    `🪑 Стол №${table?.number || 'уточняется'}\n\n` +
    `Ждём вас! Напомним за 2 часа до брони. 🎉`
  )

  // Уведомить руководство о крупной брони
  if (d.guests! >= 6) {
    await notifyManagement(
      `🔔 <b>Крупная бронь!</b>\n\n` +
      `👤 ${d.name} (${d.phone})\n` +
      `👥 ${d.guests} гостей\n` +
      `📅 ${formattedDate} в ${d.time}\n` +
      `⏱ ${d.duration} ч.`
    )

    await supabaseAdmin.from('alerts').insert({
      type: 'low_stock',
      title: `Крупная бронь: ${d.guests} гостей`,
      message: `${d.name} забронировал на ${d.guests} гостей ${formattedDate} в ${d.time}`,
      metadata: { reservation_id: reservation.id },
    })
  }

  clearSession(userId)
}

export async function handleCancelReservation(chatId: number, reservationId: string) {
  const { data: reservation } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .select('*, table:tables(*)')
    .single() as { data: Reservation & { table: Table } | null }

  if (!reservation) {
    await sendMessage(chatId, '❌ Бронирование не найдено.')
    return
  }

  if (reservation.table_id) {
    await supabaseAdmin
      .from('tables')
      .update({ status: 'free' })
      .eq('id', reservation.table_id)
  }

  await sendMessage(chatId, `✅ Бронирование ${reservation.guest_name} отменено.`)

  if (reservation.guests_count >= 6) {
    await notifyManagement(
      `⚠️ <b>Отмена крупной брони!</b>\n\n` +
      `👤 ${reservation.guest_name}\n` +
      `👥 ${reservation.guests_count} гостей\n` +
      `📅 ${reservation.reservation_date} в ${reservation.start_time}`
    )
  }
}
