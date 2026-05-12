'use client'

import { useState, useEffect } from 'react'
import { InventoryItem } from '@/types'
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  tobacco: 'Табак', coal: 'Уголь', syrup: 'Сиропы',
  alcohol: 'Алкоголь', soft_drink: 'Безалкогольное',
  consumable: 'Расходники', other: 'Прочее',
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState<'delivery' | 'waste' | 'manual_adjustment'>('delivery')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/inventory')
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUpdate = async (id: string) => {
    const amount = parseFloat(delta)
    if (isNaN(amount)) return
    await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, change_amount: amount, reason }),
    })
    setEditId(null)
    setDelta('')
    load()
  }

  const byCategory = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const lowCount = items.filter(i => i.current_stock <= i.min_stock).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Склад</h2>
          <p className="text-sm text-gray-500 mt-1">
            {lowCount > 0
              ? <span className="text-red-600 font-medium">⚠️ {lowCount} позиций ниже минимума</span>
              : <span className="text-green-600">✅ Все остатки в норме</span>
            }
          </p>
        </div>
      </div>

      {Object.entries(byCategory).map(([category, categoryItems]) => (
        <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">{CATEGORY_LABELS[category] || category}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Наименование', 'Остаток', 'Минимум', 'Ед.', 'Поставщик', 'Статус', 'Действие'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryItems.map(item => {
                const isLow = item.current_stock <= item.min_stock
                const isEditing = editId === item.id
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.min_stock}</td>
                    <td className="px-4 py-3 text-gray-400">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.supplier_name || '—'}</td>
                    <td className="px-4 py-3">
                      {isLow
                        ? <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} />Критично</span>
                        : <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} />Норма</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={reason}
                            onChange={e => setReason(e.target.value as typeof reason)}
                            className="border border-gray-200 rounded px-2 py-1 text-xs"
                          >
                            <option value="delivery">Поставка</option>
                            <option value="waste">Списание</option>
                            <option value="manual_adjustment">Корр.</option>
                          </select>
                          <input
                            type="number"
                            value={delta}
                            onChange={e => setDelta(e.target.value)}
                            placeholder="±кол-во"
                            className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
                          />
                          <button onClick={() => handleUpdate(item.id)} className="text-xs text-indigo-600 font-medium">OK</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-400">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditId(item.id); setDelta('') }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Plus size={12} /> Изменить
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
