import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'EXCHANGE_RATE_API_KEY 미설정' }, { status: 503 })
  }

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/KRW`)
    if (!res.ok) throw new Error('API 호출 실패')
    const json = await res.json()
    const rate = Math.round(json.conversion_rate)
    return NextResponse.json({ rate, date })
  } catch (err) {
    console.error('[exchange-rate] 실패:', err)
    return NextResponse.json({ error: '환율 조회 실패' }, { status: 500 })
  }
}
