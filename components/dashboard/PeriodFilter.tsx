'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { getYearOptions } from '@/lib/utils'

export default function PeriodFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('period') ?? 'all'

  function setPeriod(period: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.push(`/dashboard?${params.toString()}`)
  }

  const years = getYearOptions()
  const options = [
    { value: 'all', label: '전체' },
    ...years.map(y => ({ value: String(y), label: `${y}년` })),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setPeriod(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            current === opt.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
