import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('transactions')
    .select('date, class, amount')
    .is('deleted_at', null)
    .neq('class', '이체')
    .order('date')

  if (from) query = query.gte('date', `${from}-01`)
  if (to) {
    const [y, m] = to.split('-').map(Number)
    query = query.lte('date', `${to}-${new Date(y, m, 0).getDate()}`)
  }

  const { data, error } = await query
  if (error) return serverError(error.message)

  // 월별 집계
  const map = new Map<string, { income: number; expense: number }>()
  for (const t of data) {
    const month = t.date.slice(0, 7)
    const cur = map.get(month) ?? { income: 0, expense: 0 }
    if (t.class === '수입') cur.income += t.amount
    else cur.expense += t.amount
    map.set(month, cur)
  }

  const result = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      savings: income - expense,
    }))

  return NextResponse.json(result, { headers: { 'Cache-Control': 'max-age=300' } })
}
