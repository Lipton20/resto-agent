'use client'

import { useState, useEffect } from 'react'
import { Reservation } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, Phone, Users, Clock } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Подтверждена', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Ожидает', cls: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Отменена', cls: 'bg-red-100 text-red-700' },
  completed: { label: 'Завершена', cls: 'bg-gray-100 text-gray-600' },
}

export default function ReservationsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reservations, setReservations] = useState<(Reservation & { table?: { number: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    guest_name: '', guest_phone: '', guests_count: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    start_time: '19:00', duration_hours: 2, notes: '',
  })

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/reservations?date=${date}`)
    setReservations(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [date])

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить бронирование?')) return
    await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    load()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ guest_name: '', guest_phone: '', guests_count: 2, reservation_date: new Date().toISOString().split('T')[0], start_time: '19:00', duration_hours: 2, notes: '' })
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Бронирования</h2>
          <p className="text-sm text-gray-500 mt-1">Управление бронированием столов</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Новая бронь
        </button>
      </div>

      {/* New Reservation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-gray-900">Новое бронирование</h3>
          {[
            { label: 'Имя гостя', key: 'guest_name', type: 'text', required: true },
            { label: 'Телефон', key: 'guest_phone', type: 'tel', required: true },
            { label: 'Дата', key: 'reservation_date', type: 'date', required: true },
            { label: 'Время', key: 'start_time', type: 'time', required: true },
            { label: 'Кол-во гостей', key: 'guests_count', type: 'number', required: true },
            { label: 'Продолжительность (ч)', key: 'duration_hours', type: 'number', required: true },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                required={required}
                value={String(form[key as keyof typeof form])}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Заметки</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Создать</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Отмена</button>
          </div>
        </form>
      )}

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Дата:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-400">
          {format(new Date(date + 'T00:00:00'), 'EEEE, d MMMM', { locale: ru })}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Броней на эту дату нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Гость', 'Телефон', 'Время', 'Гостей', 'Стол', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.guest_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="flex items-center gap-1"><Phone size={12} />{r.guest_phone}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1"><Clock size={12} />{r.start_time.slice(0,5)} ({r.duration_hours}ч)</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1"><Users size={12} />{r.guests_count}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">№{r.table?.number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[r.status]?.cls}`}>
                      {STATUS_LABELS[r.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Отменить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
