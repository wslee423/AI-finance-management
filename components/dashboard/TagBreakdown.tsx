'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1']

function formatAmount(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  if (v >= 10000) return `${Math.round(v / 10000)}만`
  return `${v.toLocaleString()}`
}

interface Props {
  data: { tag: string; amount: number }[]
}

export default function TagBreakdown({ data }: Props) {
  if (!data.length) {
    return <p className="text-sm text-gray-400 text-center py-8">태그가 있는 지출 데이터가 없어요</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="tag"
          width={110}
          tick={{ fontSize: 12, fill: '#374151' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString()}원`, '지출']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          cursor={{ fill: '#f3f4f6' }}
        />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: formatAmount }}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
