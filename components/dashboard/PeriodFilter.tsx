'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getYearOptions } from '@/lib/utils'

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function PeriodFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('period') ?? 'all'

  // 현재 선택이 YYYY-MM이면 해당 연도를 펼친 상태로 시작
  const initExpanded = current.match(/^(\d{4})-\d{2}$/) ? Number(current.slice(0, 4)) : null
  const [expandedYear, setExpandedYear] = useState<number | null>(initExpanded)

  function setPeriod(period: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.push(`/dashboard?${params.toString()}`)
  }

  function handleYearClick(year: number) {
    if (expandedYear === year) {
      // 같은 연도 재클릭: 월 패널 닫고 연간 전체 선택
      setExpandedYear(null)
      setPeriod(String(year))
    } else {
      setExpandedYear(year)
      setPeriod(String(year))
    }
  }

  function handleMonthClick(year: number, monthIdx: number) {
    const m = String(monthIdx + 1).padStart(2, '0')
    setPeriod(`${year}-${m}`)
  }

  const years = getYearOptions()

  // 현재 선택된 연도/월 파싱
  const selectedYear = current === 'all' ? null : Number(current.slice(0, 4))
  const selectedMonth = current.match(/^\d{4}-(\d{2})$/) ? Number(current.slice(5)) : null

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* 연도 행 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setExpandedYear(null); setPeriod('all') }}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            current === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        {years.map(y => (
          <button
            key={y}
            onClick={() => handleYearClick(y)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              selectedYear === y
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {y}년
            {expandedYear === y && <span className="ml-1 text-xs opacity-70">▲</span>}
            {expandedYear !== y && <span className="ml-1 text-xs opacity-40">▼</span>}
          </button>
        ))}
      </div>

      {/* 월 선택 행 — 연도 선택 시 나타남 */}
      {expandedYear !== null && (
        <div className="flex flex-wrap gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <button
            onClick={() => setPeriod(String(expandedYear))}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              selectedYear === expandedYear && selectedMonth === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            연간 전체
          </button>
          {MONTHS.map((label, i) => {
            const isSelected = selectedYear === expandedYear && selectedMonth === i + 1
            return (
              <button
                key={i}
                onClick={() => handleMonthClick(expandedYear, i)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
