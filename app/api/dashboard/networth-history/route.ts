import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('snapshot_date, asset_type, balance')
    .order('snapshot_date')

  if (error) return serverError(error.message)

  // snapshot_date별 자산유형 집계
  const dateMap = new Map<string, {
    realestate: number; stocks: number; pension: number
    savings: number; others: number; loans: number
  }>()

  for (const a of data) {
    const d = a.snapshot_date
    const cur = dateMap.get(d) ?? { realestate: 0, stocks: 0, pension: 0, savings: 0, others: 0, loans: 0 }
    if (a.asset_type === '부동산') cur.realestate += a.balance
    else if (a.asset_type === '통장') cur.stocks += a.balance
    else if (a.asset_type === '연금') cur.pension += a.balance
    else if (a.asset_type === '예적금') cur.savings += a.balance
    else if (a.asset_type === '대출') cur.loans += a.balance
    else cur.others += a.balance
    dateMap.set(d, cur)
  }

  const result = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      ...v,
      netWorth: v.realestate + v.stocks + v.pension + v.savings + v.others + v.loans,
    }))

  return NextResponse.json(result, { headers: { 'Cache-Control': 'max-age=300' } })
}
