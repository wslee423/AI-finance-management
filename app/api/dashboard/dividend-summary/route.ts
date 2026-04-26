import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dividend')
    .select('date, krw_amount')
    .order('date')

  if (error) return serverError(error.message)

  // 연도별 집계
  const yearMap = new Map<number, number>()
  // 월×연도 피봇
  const pivotMap = new Map<string, number>() // key: 'YYYY-MM'

  for (const d of data) {
    const year = Number(d.date.slice(0, 4))
    const month = d.date.slice(0, 7)
    yearMap.set(year, (yearMap.get(year) ?? 0) + d.krw_amount)
    pivotMap.set(month, (pivotMap.get(month) ?? 0) + d.krw_amount)
  }

  const years = Array.from(yearMap.keys()).sort()
  const byYear = years.map((year, i) => {
    const total = yearMap.get(year)!
    // 해당 연도 월 수 계산 (현재 진행 중인 연도는 실제 월 수)
    const months = data.filter(d => d.date.startsWith(String(year)))
    const uniqueMonths = new Set(months.map(d => d.date.slice(0, 7))).size
    const prevTotal = i > 0 ? yearMap.get(years[i - 1])! : null
    return {
      year,
      total,
      monthlyAvg: uniqueMonths > 0 ? Math.round(total / uniqueMonths) : 0,
      growthRate: prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 10000) / 100 : null,
    }
  })

  // 피봇 테이블: 월(1~12) × 연도
  const pivot = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const row: Record<string, number | string> = { month: `${month}월` }
    for (const year of years) {
      const key = `${year}-${String(month).padStart(2, '0')}`
      row[String(year)] = pivotMap.get(key) ?? 0
    }
    return row
  })

  return NextResponse.json(
    { byYear, pivot, years },
    { headers: { 'Cache-Control': 'max-age=300' } }
  )
}
