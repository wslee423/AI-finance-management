import { createClient } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, serverError } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const supabase = await createClient()

  // 최신 snapshot_date 조회
  const { data: latest, error: latestErr } = await supabase
    .from('assets')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (latestErr) return serverError(latestErr.message)
  if (!latest) return NextResponse.json({ owner: [], spouse: [], ownerTotal: 0, spouseTotal: 0 })

  const { data, error } = await supabase
    .from('assets')
    .select('asset_type, owner, balance, contribution_rate')
    .eq('snapshot_date', latest.snapshot_date)

  if (error) return serverError(error.message)

  const ownerMap = new Map<string, number>()
  const spouseMap = new Map<string, number>()

  for (const a of data) {
    const rate = a.contribution_rate ?? (a.owner === '공동' ? 0.5 : a.owner === '운섭' ? 1 : 0)

    if (a.owner === '운섭') {
      ownerMap.set(a.asset_type, (ownerMap.get(a.asset_type) ?? 0) + a.balance)
    } else if (a.owner === '아름') {
      spouseMap.set(a.asset_type, (spouseMap.get(a.asset_type) ?? 0) + a.balance)
    } else {
      // 공동: contribution_rate로 분배
      ownerMap.set(a.asset_type, (ownerMap.get(a.asset_type) ?? 0) + Math.round(a.balance * rate))
      spouseMap.set(a.asset_type, (spouseMap.get(a.asset_type) ?? 0) + Math.round(a.balance * (1 - rate)))
    }
  }

  const toBreakdown = (m: Map<string, number>) =>
    Array.from(m.entries()).map(([category, balance]) => ({ category, balance })).sort((a, b) => b.balance - a.balance)

  const owner = toBreakdown(ownerMap)
  const spouse = toBreakdown(spouseMap)

  return NextResponse.json(
    {
      snapshotDate: latest.snapshot_date,
      owner,
      spouse,
      ownerTotal: owner.reduce((s, v) => s + v.balance, 0),
      spouseTotal: spouse.reduce((s, v) => s + v.balance, 0),
    },
    { headers: { 'Cache-Control': 'max-age=300' } }
  )
}
