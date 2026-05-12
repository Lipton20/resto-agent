import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabaseAdmin
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) query = query.eq('is_read', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, all } = await req.json()

  if (all) {
    const { error } = await supabaseAdmin.from('alerts').update({ is_read: true }).eq('is_read', false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
