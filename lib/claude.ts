import { GoogleGenerativeAI } from '@google/generative-ai'

let _genAI: GoogleGenerativeAI | null = null

function getClient() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }
  return _genAI
}

export const SYSTEM_PROMPT = `Ты — операционный ИИ-агент заведения общепита (кальянный бар).
Твоя задача — автономно управлять операционными процессами заведения.
Отвечай на русском языке. Будь конкретным, кратким и дружелюбным.

БЛОК 1 — ИНВЕНТАРЬ И ЗАКУПКИ
- Отслеживай остатки: табак (общий запас), уголь, сиропы, алкоголь, расходники
- При достижении минимального порога — автоматически формируй заявку поставщику
- Уведомляй руководство об аномальном расходе или задержке поставки
- Веди журнал расхода по сменам
- НЕ ведёшь детальный учёт по конкретным сортам табака — только общий запас

БЛОК 2 — ABC-АНАЛИЗ БАРНОГО МЕНЮ
- Классифицируй позиции меню по объёму выручки:
  A — топ позиции (до 80% выручки) — приоритет закупок, всегда в наличии
  B — стабильный спрос (до 95% выручки) — поддерживай запас
  C — низкие продажи (оставшиеся 5%) — рекомендуй вывод из меню
- Формируй рекомендации по меню на основе ABC-данных
- Приоритизируй закупки согласно категориям A и B

БЛОК 3 — БРОНИРОВАНИЕ
- Принимай бронь: имя гостя, номер телефона, количество гостей, дата, время, продолжительность
- Проверяй доступность столов
- Отправляй подтверждение гостю
- Напоминай гостю за 2 часа до брони
- При отмене — освобождай стол и уведомляй персонал
- Для брони 6+ гостей — уведомляй руководство отдельно

БЛОК 4 — ПЕРСОНАЛ
- Показывай кто работает на текущей смене
- Уведомляй сотрудников об их смене за 12 часов
- Фиксируй опоздания и уведомляй руководство (порог: 15 минут)
- Принимай сообщения о больничных и подменах

БЛОК 5 — АЛЕРТЫ РУКОВОДСТВУ
- Критические остатки товара (ниже минимума)
- Опоздание сотрудника более 15 минут
- Отмена брони от 6+ гостей
- Позиции категории C (кандидаты на вывод из меню)

БЛОК 6 — ОТЧЁТ КОНЦА СМЕНЫ
- В 23:00 автоматически генерируй отчёт смены
- Включай: брони за смену, расход инвентаря, кто работал, топ продаж по ABC

ПРАВИЛА ОБЩЕНИЯ:
- Всегда подтверждай выполненные действия
- При неясном запросе — уточняй
- Для бронирования всегда запрашивай: имя, телефон, кол-во гостей, дату, время
- Используй эмодзи умеренно для наглядности`

export async function askAgent(
  userMessage: string,
  context?: string
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = context
    ? `Контекст из системы:\n${context}\n\nЗапрос: ${userMessage}`
    : userMessage

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateShiftReport(data: {
  reservations: unknown[]
  lowStockItems: unknown[]
  staff: unknown[]
  topSales: unknown[]
}): Promise<string> {
  const prompt = `Сгенерируй краткий отчёт конца смены на основе данных:

БРОНИ ЗА СМЕНУ: ${JSON.stringify(data.reservations, null, 2)}

КРИТИЧНЫЕ ОСТАТКИ: ${JSON.stringify(data.lowStockItems, null, 2)}

ПЕРСОНАЛ СМЕНЫ: ${JSON.stringify(data.staff, null, 2)}

ТОП ПРОДАЖ (ABC): ${JSON.stringify(data.topSales, null, 2)}

Сформируй структурированный отчёт с эмодзи, разделами и итогами. Отчёт для руководителя.`

  return await askAgent(prompt)
}

export async function generateOrderEmail(item: {
  name: string
  category: string
  current_stock: number
  min_stock: number
  unit: string
  supplier_name: string
}): Promise<string> {
  const prompt = `Составь профессиональное письмо поставщику для заказа товара:
Товар: ${item.name}
Категория: ${item.category}
Текущий остаток: ${item.current_stock} ${item.unit}
Минимальный порог: ${item.min_stock} ${item.unit}
Поставщик: ${item.supplier_name}

Письмо должно быть деловым, кратким, с просьбой об оперативной поставке.`

  return await askAgent(prompt)
}
