'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  BarChart3,
  Bell,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/reservations', label: 'Бронирования', icon: Calendar },
  { href: '/inventory', label: 'Склад', icon: Package },
  { href: '/staff', label: 'Персонал', icon: Users },
  { href: '/analytics', label: 'ABC-анализ', icon: BarChart3 },
  { href: '/alerts', label: 'Алерты', icon: Bell },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">🍹 RestoAgent</h1>
        <p className="text-xs text-gray-400 mt-0.5">Система управления</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">RestoAgent v1.0</p>
      </div>
    </aside>
  )
}
