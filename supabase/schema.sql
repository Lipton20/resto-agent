-- ============================================================
-- RESTO AGENT — Supabase Schema
-- ============================================================

-- Tables (физические столы заведения)
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  capacity integer not null,
  status text not null default 'free' check (status in ('free', 'reserved', 'occupied')),
  created_at timestamptz default now()
);

-- Staff (сотрудники)
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  role text not null check (role in ('manager', 'bartender', 'hookah_master', 'waiter', 'admin')),
  telegram_id bigint unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Shifts (смены)
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'missed')),
  checked_in_at timestamptz,
  created_at timestamptz default now()
);

-- Reservations (брони)
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_phone text not null,
  guests_count integer not null check (guests_count > 0),
  table_id uuid references tables(id),
  reservation_date date not null,
  start_time time not null,
  duration_hours numeric(3,1) not null default 2,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

-- Inventory (инвентарь / склад)
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('tobacco', 'coal', 'syrup', 'alcohol', 'soft_drink', 'consumable', 'other')),
  current_stock numeric(10,2) not null default 0,
  min_stock numeric(10,2) not null default 0,
  unit text not null default 'шт',
  supplier_email text,
  supplier_name text,
  price_per_unit numeric(10,2),
  created_at timestamptz default now()
);

-- Inventory Transactions (движение товара)
create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id) on delete cascade,
  change_amount numeric(10,2) not null,
  reason text not null check (reason in ('sale', 'delivery', 'waste', 'manual_adjustment')),
  shift_id uuid references shifts(id),
  notes text,
  created_at timestamptz default now()
);

-- Menu Items (позиции барного меню для ABC-анализа)
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('cocktail', 'lemonade', 'hookah', 'soft_drink', 'alcohol', 'snack', 'other')),
  price numeric(10,2) not null,
  cost_price numeric(10,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Sales (продажи для ABC-анализа)
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  quantity integer not null default 1,
  total_price numeric(10,2) not null,
  shift_id uuid references shifts(id),
  sold_at timestamptz default now()
);

-- Supplier Orders (заказы поставщикам)
create table if not exists supplier_orders (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id) on delete cascade,
  quantity numeric(10,2) not null,
  status text not null default 'sent' check (status in ('sent', 'confirmed', 'delivered', 'cancelled')),
  supplier_email text,
  notes text,
  sent_at timestamptz default now(),
  delivered_at timestamptz
);

-- Alerts (системные алерты)
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('low_stock', 'staff_late', 'reservation_cancelled', 'large_reservation_cancelled', 'menu_c_category', 'guest_complaint', 'order_sent', 'shift_report')),
  title text not null,
  message text not null,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Текущие брони (сегодня)
create or replace view today_reservations as
select
  r.id,
  r.guest_name,
  r.guest_phone,
  r.guests_count,
  r.reservation_date,
  r.start_time,
  r.duration_hours,
  r.status,
  r.notes,
  t.number as table_number,
  t.capacity as table_capacity
from reservations r
left join tables t on t.id = r.table_id
where r.reservation_date = current_date
order by r.start_time;

-- Текущая смена
create or replace view current_shift_staff as
select
  s.id as shift_id,
  s.status,
  s.start_time,
  s.end_time,
  s.checked_in_at,
  e.name,
  e.role,
  e.phone,
  e.telegram_id
from shifts s
join staff e on e.id = s.staff_id
where s.date = current_date
  and s.status in ('scheduled', 'active');

-- Критичные остатки (ниже минимума)
create or replace view low_stock_items as
select *
from inventory
where current_stock <= min_stock
order by (current_stock / nullif(min_stock, 0)) asc;

-- ============================================================
-- ABC-АНАЛИЗ (функция)
-- ============================================================

create or replace function get_abc_analysis(
  period_start date default (current_date - interval '30 days')::date,
  period_end date default current_date
)
returns table (
  menu_item_id uuid,
  name text,
  category text,
  total_quantity bigint,
  total_revenue numeric,
  revenue_share numeric,
  cumulative_share numeric,
  abc_class text
) as $$
with sales_agg as (
  select
    mi.id,
    mi.name,
    mi.category,
    coalesce(sum(s.quantity), 0) as total_quantity,
    coalesce(sum(s.total_price), 0) as total_revenue
  from menu_items mi
  left join sales s on s.menu_item_id = mi.id
    and s.sold_at::date between period_start and period_end
  where mi.is_active = true
  group by mi.id, mi.name, mi.category
),
totals as (
  select sum(total_revenue) as grand_total from sales_agg
),
ranked as (
  select
    sa.*,
    case when t.grand_total > 0 then round((sa.total_revenue / t.grand_total) * 100, 2) else 0 end as revenue_share,
    sum(case when t.grand_total > 0 then round((sa.total_revenue / t.grand_total) * 100, 2) else 0 end)
      over (order by sa.total_revenue desc rows between unbounded preceding and current row) as cumulative_share
  from sales_agg sa, totals t
)
select
  r.id,
  r.name,
  r.category,
  r.total_quantity,
  r.total_revenue,
  r.revenue_share,
  r.cumulative_share,
  case
    when r.cumulative_share <= 80 then 'A'
    when r.cumulative_share <= 95 then 'B'
    else 'C'
  end as abc_class
from ranked r
order by r.total_revenue desc;
$$ language sql stable;

-- ============================================================
-- SEED DATA (тестовые данные)
-- ============================================================

insert into tables (number, capacity) values
  (1, 4), (2, 4), (3, 6), (4, 6), (5, 8),
  (6, 2), (7, 2), (8, 10), (9, 4), (10, 6)
on conflict do nothing;

insert into inventory (name, category, current_stock, min_stock, unit, supplier_name, supplier_email) values
  ('Табак (общий запас)', 'tobacco', 2000, 500, 'г', 'Кальянный мир', 'order@kalyanmir.ru'),
  ('Уголь кокосовый', 'coal', 15, 5, 'кг', 'Кальянный мир', 'order@kalyanmir.ru'),
  ('Сироп Манго', 'syrup', 8, 3, 'бут', 'Барный склад', 'bar@sklad.ru'),
  ('Сироп Малина', 'syrup', 6, 3, 'бут', 'Барный склад', 'bar@sklad.ru'),
  ('Сироп Маракуйя', 'syrup', 4, 3, 'бут', 'Барный склад', 'bar@sklad.ru'),
  ('Водка Beluga', 'alcohol', 12, 4, 'бут', 'Алкодист', 'order@alkodist.ru'),
  ('Ром Bacardi', 'alcohol', 8, 3, 'бут', 'Алкодист', 'order@alkodist.ru'),
  ('Джин Beefeater', 'alcohol', 6, 3, 'бут', 'Алкодист', 'order@alkodist.ru'),
  ('Текила Jose Cuervo', 'alcohol', 5, 2, 'бут', 'Алкодист', 'order@alkodist.ru'),
  ('Сок апельсиновый', 'soft_drink', 20, 10, 'л', 'Барный склад', 'bar@sklad.ru'),
  ('Газ вода Perrier', 'soft_drink', 30, 12, 'бут', 'Барный склад', 'bar@sklad.ru'),
  ('Трубочки', 'consumable', 500, 100, 'шт', 'Хозтовары', 'zakaz@hoz.ru'),
  ('Салфетки', 'consumable', 300, 100, 'уп', 'Хозтовары', 'zakaz@hoz.ru')
on conflict do nothing;

insert into menu_items (name, category, price, cost_price) values
  ('Кальян классический', 'hookah', 1200, 350),
  ('Кальян двойной', 'hookah', 1800, 500),
  ('Лимонад Манго-Маракуйя', 'lemonade', 350, 80),
  ('Лимонад Малина-Мята', 'lemonade', 350, 80),
  ('Лимонад Клубника', 'lemonade', 350, 80),
  ('Мохито', 'cocktail', 450, 120),
  ('Апероль Шприц', 'cocktail', 500, 130),
  ('Маргарита', 'cocktail', 480, 120),
  ('Дайкири', 'cocktail', 450, 110),
  ('Пина Колада', 'cocktail', 480, 130),
  ('Сок', 'soft_drink', 200, 40),
  ('Вода', 'soft_drink', 150, 20),
  ('Чипсы', 'snack', 250, 80),
  ('Орешки', 'snack', 200, 60)
on conflict do nothing;
