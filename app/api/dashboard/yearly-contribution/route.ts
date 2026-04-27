import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()

  const [txResult, assetResult] = await Promise.all([
    supabase.from('transactions').select('date, class, amount').is('deleted_at', null).neq('class', '이체'),
    supabase.from('assets').select('snapshot_date, balance').order('snapshot_date'),
  ])

  if (txResult.error) return serverError(txResult.error.message)
  if (assetResult.error) return serverError(assetResult.error.message)

  // 연도별 순수 저축액 (수입 - 지출)
  const savingsByYear = new Map<number, { income: number; expense: number }>()
  for (const t of txResult.data) {
    const year = Number(t.date.slice(0, 4))
    const cur = savingsByYear.get(year) ?? { income: 0, expense: 0 }
    if (t.class === '수입') cur.income += t.amount
    else cur.expense += t.amount
    savingsByYear.set(year, cur)
  }

  // 연말(12월 말) 순자산
  const networthByYear = new Map<number, number>()
  for (const a of assetResult.data) {
    const [y, m] = a.snapshot_date.split('-').map(Number)
    if (m === 12) {
      networthByYear.set(y, (networthByYear.get(y) ?? 0) + a.balance)
    }
  }

  // 현재 연도 최신 스냅샷도 포함
  const latestByYear = new Map<number, { date: string; networth: number }>()
  const dateNetworth = new Map<string, number>()
  for (const a of assetResult.data) {
    const d = a.snapshot_date
    dateNetworth.set(d, (dateNetworth.get(d) ?? 0) + a.balance)
  }
  for (const [d, nw] of dateNetworth.entries()) {
    const year = Number(d.slice(0, 4))
    const cur = latestByYear.get(year)
    if (!cur || d > cur.date) latestByYear.set(year, { date: d, networth: nw })
  }

  const years = Array.from(new Set([...savingsByYear.keys(), ...latestByYear.keys()])).sort()

  const result = years.map((year, i) => {
    const nw = networthByYear.get(year) ?? latestByYear.get(year)?.networth ?? 0
    const prevNw = i > 0 ? (networthByYear.get(years[i - 1]) ?? latestByYear.get(years[i - 1])?.networth ?? 0) : 0
    const totalChange = nw - prevNw
    const { income = 0, expense = 0 } = savingsByYear.get(year) ?? {}
    const pureSavings = income - expense
    return {
      year: `${year}년`,
      endNetWorth: nw,
      growthRate: prevNw > 0 ? Math.round((totalChange / prevNw) * 10000) / 100 : 0,
      totalChange,
      pureSavings,
      investmentGain: totalChange - pureSavings,
    }
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'max-age=300' } })
}
