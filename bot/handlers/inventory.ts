import { supabaseAdmin } from '@/lib/supabase'
import { notifyManagement } from '@/lib/telegram'
import { generateOrderEmail } from '@/lib/claude'
import { sendSupplierOrder } from '@/lib/resend'
import { InventoryItem } from '@/types'

export async function checkAndOrderLowStock() {
  const { data: lowItems } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .lte('current_stock', supabaseAdmin.rpc)

  // Берём товары ниже минимума напрямую
  const { data: items } = await supabaseAdmin
    .from('low_stock_items')
    .select('*') as { data: InventoryItem[] | null }

  if (!items || items.length === 0) return

  const alerts = []
  const ordersSent = []

  for (const item of items) {
    const orderQty = item.min_stock * 3 // заказываем тройной минимум

    // Генерируем текст письма через Claude
    const emailBody = await generateOrderEmail({
      name: item.name,
      category: item.category,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      unit: item.unit,
      supplier_name: item.supplier_name || 'Поставщик',
    })

    // Отправляем email поставщику
    if (item.supplier_email) {
      await sendSupplierOrder({
        to: item.supplier_email,
        supplierName: item.supplier_name || 'Поставщик',
        itemName: item.name,
        quantity: orderQty,
        unit: item.unit,
        emailBody,
      })

      // Записываем заказ в БД
      await supabaseAdmin.from('supplier_orders').insert({
        inventory_id: item.id,
        quantity: orderQty,
        supplier_email: item.supplier_email,
        notes: `Автозаказ. Остаток: ${item.current_stock} ${item.unit}`,
      })

      ordersSent.push(`• ${item.name}: заказано ${orderQty} ${item.unit}`)
    }

    alerts.push(`🔴 ${item.name}: ${item.current_stock}/${item.min_stock} ${item.unit}`)

    await supabaseAdmin.from('alerts').insert({
      type: 'low_stock',
      title: `Критичный остаток: ${item.name}`,
      message: `Остаток ${item.current_stock} ${item.unit} (минимум: ${item.min_stock}). Заказ отправлен поставщику.`,
      metadata: { item_id: item.id, current_stock: item.current_stock },
    })
  }

  if (alerts.length > 0) {
    let message = `⚠️ <b>Критичные остатки!</b>\n\n${alerts.join('\n')}`
    if (ordersSent.length > 0) {
      message += `\n\n📧 <b>Заказы отправлены:</b>\n${ordersSent.join('\n')}`
    }
    await notifyManagement(message)
  }
}

export async function updateStock(
  itemId: string,
  changeAmount: number,
  reason: 'sale' | 'delivery' | 'waste' | 'manual_adjustment',
  shiftId?: string,
  notes?: string
) {
  const { data: item } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .eq('id', itemId)
    .single() as { data: InventoryItem | null }

  if (!item) throw new Error('Товар не найден')

  const newStock = item.current_stock + changeAmount

  await supabaseAdmin
    .from('inventory')
    .update({ current_stock: newStock })
    .eq('id', itemId)

  await supabaseAdmin.from('inventory_transactions').insert({
    inventory_id: itemId,
    change_amount: changeAmount,
    reason,
    shift_id: shiftId,
    notes,
  })

  // Проверяем не упал ли ниже минимума
  if (newStock <= item.min_stock && changeAmount < 0) {
    await checkAndOrderLowStock()
  }

  return newStock
}
