export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage, notifyManagement } from '@/lib/telegram'
import { askAgent } from '@/lib/claude'
import {
  getSession,
  startReservationSession,
  handleReservationStep,
  clearSession,
} from '@/bot/handlers/reservation'

const MANAGER_IDS = (process.env.MANAGER_TELEGRAM_IDS || '').split(',').map(Number)

function isManager(userId: number) {
  return MANAGER_IDS.includes(userId)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message || body.edited_message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const userId = message.from.id
    const text = (message.text || '').trim()

    if (!text) return NextResponse.json({ ok: true })

    // Обработка активной сессии бронирования
    const session = getSession(userId)
    if (session) {
      const handled = await handleReservationStep(userId, chatId, text)
      if (handled) return NextResponse.json({ ok: true })
    }

    // Команды
    if (text === '/start' || text === '/старт') {
      await sendMessage(
        chatId,
        `👋 <b>Привет! Я RestoAgent — умный помощник заведения.</b>\n\n` +
        `Что я умею:\n` +
        `📅 /бронь — забронировать столик\n` +
        `📋 /брони — список броней на сегодня\n` +
        `📦 /склад — остатки на складе\n` +
        `👥 /смена — кто работает сегодня\n` +
        `📊 /abc — ABC-анализ меню\n` +
        `❓ /помощь — спросить агента\n\n` +
        (isManager(userId) ? '🔑 <b>У вас есть права менеджера</b>' : '')
      )
      return NextResponse.json({ ok: true })
    }

    if (text === '/бронь' || text === '/reserve') {
      startReservationSession(userId)
      await sendMessage(chatId, '📋 Оформляем бронирование.\n\n👤 Введите имя гостя:')
      return NextResponse.json({ ok: true })
    }

    if (text === '/отмена' || text === '/cancel') {
      clearSession(userId)
      await sendMessage(chatId, '❌ Действие отменено.')
      return NextResponse.json({ ok: true })
    }

    if (text === '/брони' || text === '/reservations') {
      const { data: reservations } = await supabaseAdmin
        .from('today_reservations')
        .select('*')
        .neq('status', 'cancelled')

      if (!reservations || reservations.length === 0) {
        await sendMessage(chatId, '📋 На сегодня броней нет.')
        return NextResponse.json({ ok: true })
      }

      const list = reservations.map((r: Record<string, unknown>) =>
        `🪑 Стол №${r.table_number || '?'} | ${r.start_time} | ${r.guest_name} | ${r.guests_count} чел.`
      ).join('\n')

      await sendMessage(chatId, `📋 <b>Брони на сегодня:</b>\n\n${list}`)
      return NextResponse.json({ ok: true })
    }

    if (text === '/склад' || text === '/inventory') {
      const { data: items } = await supabaseAdmin
        .from('inventory')
        .select('*')
        .order('category')

      if (!items || items.length === 0) {
        await sendMessage(chatId, '📦 Склад пуст.')
        return NextResponse.json({ ok: true })
      }

      const lowItems = items.filter((i: Record<string, unknown>) => Number(i.current_stock) <= Number(i.min_stock))
      const okItems = items.filter((i: Record<string, unknown>) => Number(i.current_stock) > Number(i.min_stock))

      let msg = '📦 <b>Состояние склада:</b>\n\n'
      if (lowItems.length > 0) {
        msg += '🔴 <b>Критичные остатки:</b>\n'
        msg += lowItems.map((i: Record<string, unknown>) => `  • ${i.name}: ${i.current_stock}/${i.min_stock} ${i.unit}`).join('\n')
        msg += '\n\n'
      }
      msg += '✅ <b>В норме:</b>\n'
      msg += okItems.map((i: Record<string, unknown>) => `  • ${i.name}: ${i.current_stock} ${i.unit}`).join('\n')

      await sendMessage(chatId, msg)
      return NextResponse.json({ ok: true })
    }

    if (text === '/смена' || text === '/shift') {
      const { data: staff } = await supabaseAdmin
        .from('current_shift_staff')
        .select('*')

      if (!staff || staff.length === 0) {
        await sendMessage(chatId, '👥 Сегодня нет запланированных смен.')
        return NextResponse.json({ ok: true })
      }

      const roleMap: Record<string, string> = {
        manager: 'Менеджер',
        bartender: 'Бармен',
        hookah_master: 'Кальянный мастер',
        waiter: 'Официант',
        admin: 'Администратор',
      }

      const list = staff.map((s: Record<string, unknown>) => {
        const status = s.status === 'active' ? '🟢' : '🔵'
        return `${status} ${s.name} — ${roleMap[s.role as string] || s.role} (${s.start_time}–${s.end_time})`
      }).join('\n')

      await sendMessage(chatId, `👥 <b>Смена сегодня:</b>\n\n${list}`)
      return NextResponse.json({ ok: true })
    }

    if (text === '/abc') {
      const { data: abcData } = await supabaseAdmin.rpc('get_abc_analysis')

      if (!abcData || abcData.length === 0) {
        await sendMessage(chatId, '📊 Нет данных для ABC-анализа.')
        return NextResponse.json({ ok: true })
      }

      const classA = abcData.filter((i: Record<string, unknown>) => i.abc_class === 'A')
      const classB = abcData.filter((i: Record<string, unknown>) => i.abc_class === 'B')
      const classC = abcData.filter((i: Record<string, unknown>) => i.abc_class === 'C')

      let msg = '📊 <b>ABC-анализ меню (30 дней):</b>\n\n'
      msg += `⭐ <b>A — Топ позиции (${classA.length}):</b>\n`
      msg += classA.map((i: Record<string, unknown>) => `  • ${i.name}: ${i.total_revenue}₽`).join('\n')
      msg += `\n\n📈 <b>B — Стабильные (${classB.length}):</b>\n`
      msg += classB.map((i: Record<string, unknown>) => `  • ${i.name}: ${i.total_revenue}₽`).join('\n')
      msg += `\n\n⚠️ <b>C — Слабые позиции (${classC.length}):</b>\n`
      msg += classC.map((i: Record<string, unknown>) => `  • ${i.name}: ${i.total_revenue}₽`).join('\n')

      await sendMessage(chatId, msg)
      return NextResponse.json({ ok: true })
    }

    // Свободный диалог с агентом
    if (text.startsWith('/помощь') || text.startsWith('/ask') || !text.startsWith('/')) {
      const query = text.replace('/помощь', '').replace('/ask', '').trim() || text

      // Получаем контекст из БД для агента
      const [{ data: lowStock }, { data: todayRes }] = await Promise.all([
        supabaseAdmin.from('low_stock_items').select('name, current_stock, min_stock, unit').limit(5),
        supabaseAdmin.from('today_reservations').select('guest_name, start_time, guests_count').limit(10),
      ])

      const context = `
Критичные остатки: ${JSON.stringify(lowStock || [])}
Брони сегодня: ${JSON.stringify(todayRes || [])}
`
      const response = await askAgent(query, context)
      await sendMessage(chatId, response)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Bot webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
