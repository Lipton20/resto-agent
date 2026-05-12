'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { ABCItem } from '@/types'

interface ABCChartProps {
  data: ABCItem[]
}

const CLASS_COLORS: Record<string, string> = {
  A: '#4f46e5',
  B: '#06b6d4',
  C: '#f59e0b',
}

export function ABCBarChart({ data }: ABCChartProps) {
  const top15 = data.slice(0, 15)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top15} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString('ru')} ₽`, 'Выручка']}
        />
        <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]}>
          {top15.map((entry, i) => (
            <Cell key={i} fill={CLASS_COLORS[entry.abc_class]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ABCPieChart({ data }: ABCChartProps) {
  const summary = ['A', 'B', 'C'].map(cls => ({
    name: `Класс ${cls}`,
    value: data.filter(i => i.abc_class === cls).reduce((s, i) => s + Number(i.total_revenue), 0),
    count: data.filter(i => i.abc_class === cls).length,
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={summary}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {summary.map((_, i) => (
            <Cell key={i} fill={Object.values(CLASS_COLORS)[i]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `${Number(v).toLocaleString('ru')} ₽`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
