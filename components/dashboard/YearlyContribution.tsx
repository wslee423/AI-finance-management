'use client'

import { formatCurrency } from '@/lib/utils'

interface YearlyData {
  year: string
  endNetWorth: number
  growthRate: number
  totalChange: number
  pureSavings: number
  investmentGain: number
}

function fmt(v: number) {
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '-'
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(2)}억`
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(0)}만`
  return formatCurrency(v)
}

export default function YearlyContribution({ data }: { data: YearlyData[] }) {
  if (data.length === 0) return <div className="text-sm text-gray-400 text-center py-8">데이터가 없습니다</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['연도', '연말 순자산', '증가율', '변동분', '순저축액', '투자손익'].map(h => (
              <th key={h} className="px-4 py-2 text-right text-xs font-medium text-gray-500 first:text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map(d => (
            <tr key={d.year} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-800">{d.year}</td>
              <td className="px-4 py-2 text-right font-medium">{(d.endNetWorth / 100000000).toFixed(2)}억</td>
              <td className={`px-4 py-2 text-right font-medium ${d.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {d.growthRate >= 0 ? '+' : ''}{d.growthRate}%
              </td>
              <td className={`px-4 py-2 text-right ${d.totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(d.totalChange)}</td>
              <td className={`px-4 py-2 text-right ${d.pureSavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(d.pureSavings)}</td>
              <td className={`px-4 py-2 text-right ${d.investmentGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(d.investmentGain)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
