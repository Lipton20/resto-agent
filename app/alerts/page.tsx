'use client'

import { useState, useEffect } from 'react'
import { Alert } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CheckCheck } from 'lucide-react'

const ALERT_ICONS: Record<string, string> = {
  low_stock: '📦', staff_late: '⏰', reservation_cancelled: '❌',
  large_reservation_cancelled: '⚠️', order_sent: '📧',
  shift_report: '📊', menu_c_category: '📉', guest_complaint: '💬',
}

const ALERT_LABELS: Record<string, string> = {
  low_stock: 'Остатки', staff_late: 'Опоздание', reservation_cancelled: 'Отмена брони',
  large_reservation_cancelled: 'Крупная отмена', order_sent: 'Заказ отправлен',
  shift_report: 'Отчёт смены', menu_c_category: 'Меню-C', guest_complaint: 'Жалоба',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/alerts${filter === 'unread' ? '?unread=true' : ''}`)
    setAlerts(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const markRead = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const markAllRead = async () => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    load()
  }

  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Алерты</h2>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? <span className="text-yellow-600 font-medium">{unreadCount} непрочитанных</span> : 'Все прочитаны'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 ${filter === f ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {f === 'all' ? 'Все' : 'Непрочитанные'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg"
            >
              <CheckCheck size={14} /> Прочитать все
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Загрузка...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            {filter === 'unread' ? 'Нет непрочитанных алертов' : 'Алертов нет'}
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border flex items-start gap-4 p-4 transition-colors ${
                !alert.is_read ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <span className="text-2xl mt-0.5">{ALERT_ICONS[alert.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {ALERT_LABELS[alert.type] || alert.type}
                      </span>
                      {!alert.is_read && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 mt-1">{alert.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{alert.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {format(new Date(alert.created_at), 'dd MMM, HH:mm', { locale: ru })}
                    </p>
                    {!alert.is_read && (
                      <button
                        onClick={() => markRead(alert.id)}
                        className="text-xs text-indigo-600 hover:underline mt-1"
                      >
                        Прочитано
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
