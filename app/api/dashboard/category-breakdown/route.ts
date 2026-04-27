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
    .select('category, subcategory, amount')
    .is('deleted_at', null)
    .eq('class', '지출')

  if (from) query = query.gte('date', `${from}-01`)
  if (to) {
    const [y, m] = to.split('-').map(Number)
    query = query.lte('date', `${to}-${new Date(y, m, 0).getDate()}`)
  }

  const { data, error } = await query
  if (error) return serverError(error.message)

  const total = data.reduce((s, t) => s + t.amount, 0)

  // 카테고리별 집계
  const catMap = new Map<string, { amount: number; subMap: Map<string, number> }>()
  for (const t of data) {
    const cat = catMap.get(t.category) ?? { amount: 0, subMap: new Map() }
    cat.amount += t.amount
    const subKey = t.subcategory ?? '기타'
    cat.subMap.set(subKey, (cat.subMap.get(subKey) ?? 0) + t.amount)
    catMap.set(t.category, cat)
  }

  const result = Array.from(catMap.entries())
    .map(([category, { amount, subMap }]) => ({
      category,
      amount,
      ratio: total > 0 ? Math.round((amount / total) * 1000) / 1000 : 0,
      subcategories: Array.from(subMap.entries())
        .map(([name, amt]) => ({ name, amount: amt }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json(result, { headers: { 'Cache-Control': 'max-age=300' } })
}
