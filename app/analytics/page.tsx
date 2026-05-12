'use client'

import { useState, useEffect } from 'react'
import { ABCItem } from '@/types'
import { ABCBarChart, ABCPieChart } from '@/components/ABCChart'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const CLASS_INFO = {
  A: { label: 'Класс A — Топ позиции', desc: 'Приносят 80% выручки. Всегда в приоритете закупок.', color: 'bg-indigo-100 text-indigo-700', icon: TrendingUp },
  B: { label: 'Класс B — Стабильные', desc: 'Формируют 15% выручки. Поддерживать запас.', color: 'bg-cyan-100 text-cyan-700', icon: Minus },
  C: { label: 'Класс C — Слабые позиции', desc: 'Только 5% выручки. Рассмотреть вывод из меню.', color: 'bg-amber-100 text-amber-700', icon: TrendingDown },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<ABCItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  const load = async () => {
    setLoading(true)
    const from = new Date(Date.now() - period * 86400000).toISOString().split('T')[0]
    const to = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/abc?from=${from}&to=${to}`)
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [period])

  const totalRevenue = data.reduce((s, i) => s + Number(i.total_revenue), 0)
  const byClass = {
    A: data.filter(i => i.abc_class === 'A'),
    B: data.filter(i => i.abc_class === 'B'),
    C: data.filter(i => i.abc_class === 'C'),
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ABC-анализ меню</h2>
          <p className="text-sm text-gray-500 mt-1">Анализ продаж барного меню по методу ABC</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Период:</label>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === d ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d} дней
            </button>
          ))}
        </div>
      </div>

      {/* Class Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['A', 'B', 'C'] as const).map(cls => {
          const info = CLASS_INFO[cls]
          const items = byClass[cls]
          const revenue = items.reduce((s, i) => s + Number(i.total_revenue), 0)
          const Icon = info.icon
          return (
            <div key={cls} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${info.color}`}>{cls}</span>
                <Icon size={16} className="text-gray-400" />
              </div>
              <p className="text-lg font-bold text-gray-900">{items.length} позиций</p>
              <p className="text-sm text-gray-500">{revenue.toLocaleString('ru')} ₽</p>
              <p className="text-xs text-gray-400 mt-2">{info.desc}</p>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Загрузка...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Нет данных о продажах за выбранный период
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Выручка по позициям</h3>
              <ABCBarChart data={data} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Распределение выручки</h3>
              <ABCPieChart data={data} />
            </div>
          </div>

          {/* Full Table */}
          {(['A', 'B', 'C'] as const).map(cls => (
            <div key={cls} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-3`}>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${CLASS_INFO[cls].color}`}>{cls}</span>
                <span className="text-sm font-semibold text-gray-700">{CLASS_INFO[cls].label}</span>
                <span className="text-xs text-gray-400 ml-auto">{byClass[cls].length} позиций</span>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Позиция', 'Категория', 'Продаж', 'Выручка', 'Доля', 'Накопленная доля'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byClass[cls].map(item => (
                    <tr key={item.menu_item_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{item.category}</td>
                      <td className="px-4 py-3 text-gray-600">{item.total_quantity}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{Number(item.total_revenue).toLocaleString('ru')} ₽</td>
                      <td className="px-4 py-3 text-gray-600">{Number(item.revenue_share).toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(Number(item.cumulative_share), 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10">{Number(item.cumulative_share).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
