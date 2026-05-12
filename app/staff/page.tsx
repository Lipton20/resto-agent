'use client'

import { useState, useEffect } from 'react'
import { Shift, Staff } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { UserCheck } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Менеджер', bartender: 'Бармен',
  hookah_master: 'Кальянный мастер', waiter: 'Официант', admin: 'Администратор',
}

const SHIFT_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Запланирована', cls: 'bg-blue-100 text-blue-700' },
  active: { label: 'На смене', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Завершена', cls: 'bg-gray-100 text-gray-600' },
  missed: { label: 'Пропустил', cls: 'bg-red-100 text-red-700' },
}

export default function StaffPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [shifts, setShifts] = useState<(Shift & { staff: Staff })[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staff_id: '', date: new Date().toISOString().split('T')[0], start_time: '12:00', end_time: '00:00' })

  const load = async () => {
    setLoading(true)
    const [shiftsRes, staffRes] = await Promise.all([
      fetch(`/api/staff?date=${date}`),
      fetch('/api/staff?type=staff'),
    ])
    setShifts(await shiftsRes.json())
    setAllStaff(await staffRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [date])

  const handleCheckin = async (id: string) => {
    await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'checkin' }),
    })
    load()
  }

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Персонал</h2>
          <p className="text-sm text-gray-500 mt-1">Расписание смен</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Добавить смену
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddShift} className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-gray-900">Новая смена</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Сотрудник</label>
            <select
              required
              value={form.staff_id}
              onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Выберите...</option>
              {allStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({ROLE_LABELS[s.role]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дата</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Начало</label>
            <input type="time" required value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Конец</label>
            <input type="time" required value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Создать</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600">Отмена</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Дата:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <span className="text-sm text-gray-400">{format(new Date(date + 'T00:00:00'), 'EEEE, d MMMM', { locale: ru })}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Смен на эту дату нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Сотрудник', 'Должность', 'Время смены', 'Отметка', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.staff?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{ROLE_LABELS[s.staff?.role] || s.staff?.role}</td>
                  <td className="px-4 py-3 text-gray-600">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.checked_in_at ? format(new Date(s.checked_in_at), 'HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${SHIFT_STATUS[s.status]?.cls}`}>
                      {SHIFT_STATUS[s.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.status === 'scheduled' && (
                      <button
                        onClick={() => handleCheckin(s.id)}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                      >
                        <UserCheck size={14} /> Отметить приход
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
