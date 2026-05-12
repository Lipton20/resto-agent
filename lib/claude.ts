// AI agent placeholder — подключить позже (Google Gemini или Anthropic)

export const SYSTEM_PROMPT = `Ты — операционный ИИ-агент кальянного бара.`

export async function askAgent(
  userMessage: string,
  _context?: string
): Promise<string> {
  return `Получен запрос: ${userMessage}\n\n(ИИ-агент будет подключён позже)`
}

export async function generateShiftReport(data: {
  reservations: unknown[]
  lowStockItems: unknown[]
  staff: unknown[]
  topSales: unknown[]
}): Promise<string> {
  return `Отчёт смены:\n• Броней: ${data.reservations.length}\n• Критичных остатков: ${data.lowStockItems.length}\n• Сотрудников: ${data.staff.length}\n• Топ продаж: ${data.topSales.length} позиций`
}

export async function generateOrderEmail(item: {
  name: string
  category: string
  current_stock: number
  min_stock: number
  unit: string
  supplier_name: string
}): Promise<string> {
  return `Уважаемый ${item.supplier_name},\n\nПросим срочно поставить: ${item.name}\nТекущий остаток: ${item.current_stock} ${item.unit} (минимум: ${item.min_stock} ${item.unit}).\n\nС уважением, RestoAgent`
}
