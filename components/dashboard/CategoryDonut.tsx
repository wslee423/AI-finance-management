'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CategoryData {
  category: string
  amount: number
  ratio: number
  subcategories: { name: string; amount: number }[]
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

export default function CategoryDonut({ data }: { data: CategoryData[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (data.length === 0) return <div className="flex items-center justify-center h-64 text-sm text-gray-400">데이터가 없습니다</div>

  const selectedData = selected ? data.find(d => d.category === selected) : null

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="amount"
              nameKey="category"
              onClick={d => setSelected(selected === d.category ? null : d.category)}
              cursor="pointer"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={!selected || selected === data[i].category ? 1 : 0.4} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 min-w-0">
        {selectedData ? (
          <>
            <p className="text-xs font-medium text-gray-700 mb-2">{selectedData.category} 세부내역</p>
            <div className="space-y-1 max-h-40 overflow-auto">
              {selectedData.subcategories.map(s => (
                <div key={s.name} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate">{s.name}</span>
                  <span className="text-gray-800 font-medium ml-2 whitespace-nowrap">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="mt-2 text-xs text-blue-600 hover:underline">← 전체 보기</button>
          </>
        ) : (
          <div className="space-y-2">
            {data.map((d, i) => (
              <div key={d.category} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1" onClick={() => setSelected(d.category)}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-gray-600 flex-1 truncate">{d.category}</span>
                <span className="text-xs font-medium text-gray-800 whitespace-nowrap">{(d.ratio * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
