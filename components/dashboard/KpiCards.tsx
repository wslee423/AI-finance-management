'use client'

import { formatCurrency } from '@/lib/utils'

interface KpiData {
  income: number
  expense: number
  savingsRate: number
  totalDividend: number
}

export default function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    { label: '총수입', value: formatCurrency(data.income), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '총지출', value: formatCurrency(data.expense), color: 'text-red-600', bg: 'bg-red-50' },
    { label: '저축률', value: `${data.savingsRate}%`, color: data.savingsRate >= 0 ? 'text-green-600' : 'text-red-600', bg: 'bg-green-50' },
    { label: '총배당금', value: formatCurrency(data.totalDividend), color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, color, bg }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <div className={`mt-2 inline-block px-2 py-0.5 rounded text-xs ${bg} ${color}`}>
            선택 기간 기준
          </div>
        </div>
      ))}
    </div>
  )
}
