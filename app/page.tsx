export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import StatCard from '@/components/StatCard'
import { Calendar, Package, Bell, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: todayRes },
    { count: activeRes },
    { count: lowStock },
    { count: unreadAlerts },
    { count: staffOnShift },
    { data: recentAlerts },
    { data: todayReservations },
  ] = await Promise.all([
    supabaseAdmin.from('reservations').select('*', { count: 'exact', head: true }).eq('reservation_date', today),
    supabaseAdmin.from('reservations').select('*', { count: 'exact', head: true }).eq('reservation_date', today).eq('status', 'confirmed'),
    supabaseAdmin.from('low_stock_items').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('alerts').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabaseAdmin.from('current_shift_staff').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('today_reservations').select('*').neq('status', 'cancelled').order('start_time'),
  ])

  return { todayRes, activeRes, lowStock, unreadAlerts, staffOnShift, recentAlerts, todayReservations }
}

const alertTypeIcon: Record<string, string> = {
  low_stock: '📦',
  staff_late: '⏰',
  reservation_cancelled: '❌',
  large_reservation_cancelled: '⚠️',
  order_sent: '📧',
  shift_report: '📊',
  menu_c_category: '📉',
  guest_complaint: '💬',
}

export default async function DashboardPage() {
  const { todayRes, activeRes, lowStock, unreadAlerts, staffOnShift, recentAlerts, todayReservations } =
    await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Дашборд</h2>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Броней сегодня" value={todayRes || 0} icon={Calendar} color="blue" />
        <StatCard title="Активных броней" value={activeRes || 0} icon={TrendingUp} color="green" />
        <StatCard title="Критичных остатков" value={lowStock || 0} icon={Package} color={lowStock ? 'red' : 'green'} />
        <StatCard title="Непрочитанных алертов" value={unreadAlerts || 0} icon={Bell} color={unreadAlerts ? 'yellow' : 'green'} />
        <StatCard title="Сотрудников на смене" value={staffOnShift || 0} icon={Users} color="purple" />
        <StatCard title="Алертов всего" value={unreadAlerts || 0} icon={AlertTriangle} color="red" subtitle="Требуют внимания" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today Reservations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Брони на сегодня</h3>
            <Link href="/reservations" className="text-xs text-indigo-600 hover:underline">Все брони →</Link>
          </div>
          {!todayReservations || todayReservations.length === 0 ? (
            <p className="text-gray-400 text-sm">Броней на сегодня нет</p>
          ) : (
            <div className="space-y-2">
              {todayReservations.slice(0, 6).map((r: Record<string, unknown>) => (
                <div key={r.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.guest_name as string}</p>
                    <p className="text-xs text-gray-400">{r.start_time as string} · {r.guests_count as number} чел. · Стол №{r.table_number as number || '?'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.status === 'confirmed' ? 'Подтверждена' : r.status === 'cancelled' ? 'Отменена' : r.status as string}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Последние алерты</h3>
            <Link href="/alerts" className="text-xs text-indigo-600 hover:underline">Все алерты →</Link>
          </div>
          {!recentAlerts || recentAlerts.length === 0 ? (
            <p className="text-gray-400 text-sm">Новых алертов нет</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a: Record<string, unknown>) => (
                <div key={a.id as string} className={`flex gap-3 p-3 rounded-lg ${!a.is_read ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  <span className="text-lg">{alertTypeIcon[a.type as string] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title as string}</p>
                    <p className="text-xs text-gray-500 truncate">{a.message as string}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
