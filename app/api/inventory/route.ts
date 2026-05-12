import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAndOrderLowStock } from '@/bot/handlers/inventory'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .order('category')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, change_amount, reason, shift_id, notes, ...updateFields } = body

  if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 })

  // Если передан change_amount — обновляем через транзакцию
  if (change_amount !== undefined) {
    const { data: item } = await supabaseAdmin
      .from('inventory')
      .select('current_stock')
      .eq('id', id)
      .single()

    if (!item) return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })

    const newStock = item.current_stock + change_amount

    const [updateResult, txResult] = await Promise.all([
      supabaseAdmin.from('inventory').update({ current_stock: newStock }).eq('id', id).select().single(),
      supabaseAdmin.from('inventory_transactions').insert({
        inventory_id: id,
        change_amount,
        reason: reason || 'manual_adjustment',
        shift_id,
        notes,
      }),
    ])

    if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 })

    // Проверяем критичные остатки
    if (change_amount < 0) await checkAndOrderLowStock()

    return NextResponse.json(updateResult.data)
  }

  // Иначе просто обновляем поля
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
