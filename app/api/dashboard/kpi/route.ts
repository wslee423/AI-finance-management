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

  // transactions 조회 (이체 제외)
  let txQuery = supabase
    .from('transactions')
    .select('class, amount')
    .is('deleted_at', null)
    .neq('class', '이체')

  if (from) txQuery = txQuery.gte('date', `${from}-01`)
  if (to) {
    const [y, m] = to.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    txQuery = txQuery.lte('date', `${to}-${lastDay}`)
  }

  // dividend 조회
  let divQuery = supabase.from('dividend').select('krw_amount')
  if (from) divQuery = divQuery.gte('date', `${from}-01`)
  if (to) {
    const [y, m] = to.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    divQuery = divQuery.lte('date', `${to}-${lastDay}`)
  }

  const [txResult, divResult] = await Promise.all([txQuery, divQuery])

  if (txResult.error) return serverError(txResult.error.message)
  if (divResult.error) return serverError(divResult.error.message)

  const income = txResult.data.filter(t => t.class === '수입').reduce((s, t) => s + t.amount, 0)
  const expense = txResult.data.filter(t => t.class === '지출').reduce((s, t) => s + t.amount, 0)
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 10000) / 100 : 0
  const totalDividend = divResult.data.reduce((s, d) => s + d.krw_amount, 0)

  return NextResponse.json(
    { income, expense, savingsRate, totalDividend },
    { headers: { 'Cache-Control': 'max-age=300' } }
  )
}
