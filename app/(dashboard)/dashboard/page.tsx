import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getKpi, getMonthlySummary, getCategoryBreakdown, getNetworthHistory,
  getSavingsRate, getYearlyContribution, getDividendSummary,
  getRecentAssets, getDividendByTicker,
} from '@/lib/dashboard/queries'
import PeriodFilter from '@/components/dashboard/PeriodFilter'
import KpiCards from '@/components/dashboard/KpiCards'
import MonthlyChart from '@/components/dashboard/MonthlyChart'
import CategoryDonut from '@/components/dashboard/CategoryDonut'
import NetWorthChart from '@/components/dashboard/NetWorthChart'
import SavingsRateChart from '@/components/dashboard/SavingsRateChart'
import YearlyContribution from '@/components/dashboard/YearlyContribution'
import DividendSection from '@/components/dashboard/DividendSection'
import DividendTickerChart from '@/components/dashboard/DividendTickerChart'
import RecentAssets from '@/components/dashboard/RecentAssets'

function periodToRange(period: string): { from?: string; to?: string } {
  if (period === 'all') return {}
  const year = Number(period)
  if (!isNaN(year)) return { from: `${year}-01`, to: `${year}-12` }
  return {}
}

// 개별 카드 섹션
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

// 대주제 구분 그룹
function SectionGroup({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <div className="flex-1 h-px bg-gray-200 ml-2" />
      </div>
      <div className="space-y-4">
        {children}
      </div>
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

  const [kpi, monthly, category, networth, savingsRate, yearly, dividend, recentAssets, dividendTicker] = await Promise.all([
    getKpi(from, to),
    getMonthlySummary(from, to),
    getCategoryBreakdown(from, to),
    getNetworthHistory(),
    getSavingsRate(from, to),
    getYearlyContribution(),
    getDividendSummary(),
    getRecentAssets(5),
    getDividendByTicker(),
  ])

  return (
    <div className="max-w-screen-2xl mx-auto space-y-10">

      {/* 헤더 + 기간 필터 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">재정 대시보드</h1>
        <Suspense>
          <PeriodFilter />
        </Suspense>
      </div>

      {/* KPI 카드 */}
      <KpiCards data={kpi} />

      {/* ── 재정 현황 ── */}
      <SectionGroup icon="📊" title="재정 현황">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Section title="월별 수입 vs 지출">
              <MonthlyChart data={monthly} />
            </Section>
          </div>
          <Section title="지출 카테고리">
            <CategoryDonut data={category} />
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="월별 저축률 추이">
            <SavingsRateChart data={savingsRate} />
          </Section>
          <Section title="연도별 저축 vs 투자 기여도">
            <YearlyContribution data={yearly} />
          </Section>
        </div>
      </SectionGroup>

      {/* ── 자산 현황 ── */}
      <SectionGroup icon="🏦" title="자산 현황">
        <Section title="순자산 성장">
          <NetWorthChart data={networth} />
        </Section>
        <Section title="최근 5개월 자산 현황">
          <RecentAssets data={recentAssets} />
        </Section>
      </SectionGroup>

      {/* ── 배당금 ── */}
      <SectionGroup icon="💰" title="배당금">
        <Section title="종목별 배당금 추이">
          <DividendTickerChart tickers={dividendTicker.tickers} series={dividendTicker.series} />
        </Section>
        <Section title="연도별 배당금 분석">
          <DividendSection data={dividend} />
        </Section>
      </SectionGroup>

    </div>
  )
}
