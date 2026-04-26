import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const months = Number(searchParams.get('months') ?? 5)

  // 최근 N개 snapshot_date 조회
  const { data: dates, error: dateErr } = await supabase
    .from('assets')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })

  if (dateErr) return serverError(dateErr.message)

  const uniqueDates = [...new Set(dates.map(d => d.snapshot_date))].slice(0, months).reverse()

  if (uniqueDates.length === 0) return NextResponse.json({ dates: [], assets: [] })

  const { data, error } = await supabase
    .from('assets')
    .select('snapshot_date, asset_type, institution, owner, balance, contribution_rate')
    .in('snapshot_date', uniqueDates)
    .order('asset_type')

  if (error) return serverError(error.message)

  // institution별 날짜별 잔액 집계
  const institutionMap = new Map<string, { asset_type: string; balances: Map<string, number> }>()

  for (const a of data) {
    const key = `${a.institution}`
    const cur = institutionMap.get(key) ?? { asset_type: a.asset_type, balances: new Map() }
    cur.balances.set(a.snapshot_date, (cur.balances.get(a.snapshot_date) ?? 0) + a.balance)
    institutionMap.set(key, cur)
  }

  const assets = Array.from(institutionMap.entries()).map(([institution, { asset_type, balances }]) => ({
    institution,
    asset_type,
    balances: uniqueDates.map(d => balances.get(d) ?? 0),
  }))

  // 합계 행 계산
  const totals = uniqueDates.map((_, i) => assets.reduce((s, a) => s + a.balances[i], 0))

  return NextResponse.json(
    { dates: uniqueDates, assets, totals },
    { headers: { 'Cache-Control': 'max-age=300' } }
  )
}
