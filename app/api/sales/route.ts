import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, menu_item:menu_items(name, category, price)')
    .gte('sold_at', from)
    .lte('sold_at', to + 'T23:59:59')
    .order('sold_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const items: Array<{ menu_item_id: string; quantity: number; shift_id?: string }> = body.items || [body]

  const { data: menuItems } = await supabaseAdmin
    .from('menu_items')
    .select('id, price')
    .in('id', items.map(i => i.menu_item_id))

  const priceMap = new Map(menuItems?.map(m => [m.id, m.price]) || [])

  const salesData = items.map(item => ({
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    total_price: (priceMap.get(item.menu_item_id) || 0) * item.quantity,
    shift_id: item.shift_id,
  }))

  const { data, error } = await supabaseAdmin
    .from('sales')
    .insert(salesData)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
