import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  let query = supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (year && month) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount는 양수여야 합니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
