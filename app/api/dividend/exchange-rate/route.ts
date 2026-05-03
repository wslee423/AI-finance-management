import { getAuthUser, unauthorized } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'EXCHANGE_RATE_API_KEY 미설정' }, { status: 503 })
  }

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/KRW`)
    if (!res.ok) throw new Error('API 호출 실패')
    const json = await res.json()
    const rate = Math.round(json.conversion_rate)
    return NextResponse.json({ rate })
  } catch (err) {
    console.error('[exchange-rate] 실패:', err)
    return NextResponse.json({ error: '환율 조회 실패' }, { status: 500 })
  }
}
