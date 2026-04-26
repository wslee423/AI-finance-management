import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { items } = body as { items: Record<string, unknown>[] }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items 배열이 필요합니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assets')
    .upsert(items, {
      onConflict: 'snapshot_date,asset_type,institution,owner',
      ignoreDuplicates: false,
    })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
