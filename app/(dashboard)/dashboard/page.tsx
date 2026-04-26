import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PeriodFilter from '@/components/dashboard/PeriodFilter'
import KpiCards from '@/components/dashboard/KpiCards'
import MonthlyChart from '@/components/dashboard/MonthlyChart'
import CategoryDonut from '@/components/dashboard/CategoryDonut'
import NetWorthChart from '@/components/dashboard/NetWorthChart'
import SavingsRateChart from '@/components/dashboard/SavingsRateChart'
import YearlyContribution from '@/components/dashboard/YearlyContribution'
import DividendSection from '@/components/dashboard/DividendSection'
import RecentAssets from '@/components/dashboard/RecentAssets'
import PersonalNetWorth from '@/components/dashboard/PersonalNetWorth'

// 기간 파라미터를 from/to 쿼리로 변환
function periodToRange(period: string): { from?: string; to?: string } {
  if (period === 'all') return {}
  const year = Number(period)
  if (!isNaN(year)) return { from: `${year}-01`, to: `${year}-12` }
  return {}
}

function buildQuery(base: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

async function fetchDashboardData(from?: string, to?: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}` : 'http://localhost:3000'

  const [kpi, monthly, category, networth, savingsRate, yearly, dividend, recentAssets, personal] = await Promise.all([
    fetch(buildQuery(`${base}/api/dashboard/kpi`, from, to), { cache: 'no-store' }).then(r => r.json()),
    fetch(buildQuery(`${base}/api/dashboard/monthly-summary`, from, to), { cache: 'no-store' }).then(r => r.json()),
    fetch(buildQuery(`${base}/api/dashboard/category-breakdown`, from, to), { cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/dashboard/networth-history`, { cache: 'no-store' }).then(r => r.json()),
    fetch(buildQuery(`${base}/api/dashboard/savings-rate`, from, to), { cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/dashboard/yearly-contribution`, { cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/dashboard/dividend-summary`, { cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/dashboard/recent-assets?months=5`, { cache: 'no-store' }).then(r => r.json()),
    fetch(`${base}/api/dashboard/personal-networth`, { cache: 'no-store' }).then(r => r.json()),
  ])

  return { kpi, monthly, category, networth, savingsRate, yearly, dividend, recentAssets, personal }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { period = 'all' } = await searchParams
  const { from, to } = periodToRange(period)

  const data = await fetchDashboardData(from, to)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 + 기간 필터 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">재정 대시보드</h1>
        <Suspense>
          <PeriodFilter />
        </Suspense>
      </div>

      {/* KPI 카드 */}
      <KpiCards data={data.kpi} />

      {/* 월별 수입/지출 + 카테고리 도넛 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="월별 수입 vs 지출">
            <MonthlyChart data={data.monthly} />
          </Section>
        </div>
        <Section title="지출 카테고리">
          <CategoryDonut data={data.category} />
        </Section>
      </div>

      {/* 순자산 성장 */}
      <Section title="순자산 성장">
        <NetWorthChart data={data.networth} />
      </Section>

      {/* 월별 저축률 + 저축 vs 투자 기여도 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="월별 저축률 추이">
          <SavingsRateChart data={data.savingsRate} />
        </Section>
        <Section title="연도별 저축 vs 투자 기여도">
          <YearlyContribution data={data.yearly} />
        </Section>
      </div>

      {/* 배당금 분석 */}
      <Section title="배당금 분석">
        <DividendSection data={data.dividend} />
      </Section>

      {/* 최근 자산 현황 + 개인별 순자산 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="최근 5개월 자산 현황">
          <RecentAssets data={data.recentAssets} />
        </Section>
        <Section title="개인별 순자산">
          <PersonalNetWorth data={data.personal} />
        </Section>
      </div>
    </div>
  )
}
