'use client'

import { formatCurrency } from '@/lib/utils'

interface PersonalData {
  snapshotDate: string
  owner: { category: string; balance: number }[]
  spouse: { category: string; balance: number }[]
  ownerTotal: number
  spouseTotal: number
}

export default function PersonalNetWorth({ data }: { data: PersonalData }) {
  const categories = [...new Set([...data.owner.map(o => o.category), ...data.spouse.map(s => s.category)])]

  const ownerMap = new Map(data.owner.map(o => [o.category, o.balance]))
  const spouseMap = new Map(data.spouse.map(s => [s.category, s.balance]))

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">{data.snapshotDate} 기준</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">자산 유형</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-blue-600">운섭</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-pink-600">아름</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(cat => (
              <tr key={cat} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{cat}</td>
                <td className="px-4 py-2 text-right text-gray-800">
                  {ownerMap.has(cat) ? formatCurrency(ownerMap.get(cat)!) : '—'}
                </td>
                <td className="px-4 py-2 text-right text-gray-800">
                  {spouseMap.has(cat) ? formatCurrency(spouseMap.get(cat)!) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 text-gray-800">합계</td>
              <td className="px-4 py-2 text-right text-blue-700">{formatCurrency(data.ownerTotal)}</td>
              <td className="px-4 py-2 text-right text-pink-700">{formatCurrency(data.spouseTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
