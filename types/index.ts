export type TableStatus = 'free' | 'reserved' | 'occupied'
export type StaffRole = 'manager' | 'bartender' | 'hookah_master' | 'waiter' | 'admin'
export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'missed'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type InventoryCategory = 'tobacco' | 'coal' | 'syrup' | 'alcohol' | 'soft_drink' | 'consumable' | 'other'
export type MenuCategory = 'cocktail' | 'lemonade' | 'hookah' | 'soft_drink' | 'alcohol' | 'snack' | 'other'
export type AlertType = 'low_stock' | 'staff_late' | 'reservation_cancelled' | 'large_reservation_cancelled' | 'menu_c_category' | 'guest_complaint' | 'order_sent' | 'shift_report'
export type ABCClass = 'A' | 'B' | 'C'

export interface Table {
  id: string
  number: number
  capacity: number
  status: TableStatus
  created_at: string
}

export interface Staff {
  id: string
  name: string
  phone: string
  role: StaffRole
  telegram_id: number | null
  is_active: boolean
  created_at: string
}

export interface Shift {
  id: string
  staff_id: string
  date: string
  start_time: string
  end_time: string
  status: ShiftStatus
  checked_in_at: string | null
  created_at: string
  staff?: Staff
}

export interface Reservation {
  id: string
  guest_name: string
  guest_phone: string
  guests_count: number
  table_id: string | null
  reservation_date: string
  start_time: string
  duration_hours: number
  status: ReservationStatus
  notes: string | null
  reminder_sent: boolean
  created_at: string
  table?: Table
}

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  current_stock: number
  min_stock: number
  unit: string
  supplier_email: string | null
  supplier_name: string | null
  price_per_unit: number | null
  created_at: string
}

export interface InventoryTransaction {
  id: string
  inventory_id: string
  change_amount: number
  reason: 'sale' | 'delivery' | 'waste' | 'manual_adjustment'
  shift_id: string | null
  notes: string | null
  created_at: string
}

export interface MenuItem {
  id: string
  name: string
  category: MenuCategory
  price: number
  cost_price: number | null
  is_active: boolean
  created_at: string
}

export interface Sale {
  id: string
  menu_item_id: string
  quantity: number
  total_price: number
  shift_id: string | null
  sold_at: string
  menu_item?: MenuItem
}

export interface SupplierOrder {
  id: string
  inventory_id: string
  quantity: number
  status: 'sent' | 'confirmed' | 'delivered' | 'cancelled'
  supplier_email: string | null
  notes: string | null
  sent_at: string
  delivered_at: string | null
  inventory_item?: InventoryItem
}

export interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ABCItem {
  menu_item_id: string
  name: string
  category: string
  total_quantity: number
  total_revenue: number
  revenue_share: number
  cumulative_share: number
  abc_class: ABCClass
}

export interface DashboardStats {
  todayReservations: number
  activeReservations: number
  lowStockCount: number
  unreadAlerts: number
  staffOnShift: number
  totalRevenue: number
}
