import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // 'YYYY-MM' or 'latest'

  let query = supabase.from('assets').select('*').order('asset_type')

  if (date === 'latest' || !date) {
    // 가장 최근 snapshot_date 조회
    const { data: latest } = await supabase
      .from('assets')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (latest) {
      query = query.eq('snapshot_date', latest.snapshot_date)
    }
  } else {
    // 해당 월의 마지막 날 계산
    const [year, month] = date.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const snapshotDate = `${date}-${String(lastDay).padStart(2, '0')}`
    query = query.eq('snapshot_date', snapshotDate)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
