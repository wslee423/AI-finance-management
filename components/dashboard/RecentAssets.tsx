'use client'

import { formatCurrency } from '@/lib/utils'

interface RecentAssetsData {
  dates: string[]
  assets: { institution: string; asset_type: string; balances: number[] }[]
  totals: number[]
}

export default function RecentAssets({ data }: { data: RecentAssetsData }) {
  const { dates, assets, totals } = data

  if (dates.length === 0) return <div className="text-sm text-gray-400 text-center py-8">데이터가 없습니다</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">자산</th>
            {dates.map(d => (
              <th key={d} className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                {d.slice(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assets.map(a => (
            <tr key={a.institution} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <p className="text-gray-800 font-medium text-xs">{a.institution}</p>
                <p className="text-gray-400 text-xs">{a.asset_type}</p>
              </td>
              {a.balances.map((b, i) => (
                <td key={i} className={`px-3 py-2 text-right text-xs ${b < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {b !== 0 ? (Math.abs(b) >= 100000000 ? `${(b / 100000000).toFixed(2)}억` : formatCurrency(b)) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50 font-semibold">
            <td className="px-3 py-2 text-blue-800 text-sm">순자산 합계</td>
            {totals.map((t, i) => (
              <td key={i} className="px-3 py-2 text-right text-blue-900 text-sm">
                {(t / 100000000).toFixed(2)}억
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
