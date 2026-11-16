-- BJNEXUS Hospitality Platform: core schema (restaurant-first). Tenant #1 = fursat.
-- Rules: every business table has tenant; guests never write orders directly (server builds them);
-- RLS on every table; money in integer paise.

-- gen_random_uuid() is built into Postgres 13+ (no extension needed)

-- ───────── tenants & people ─────────
create table public.tenants (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  settings jsonb not null default '{}'::jsonb, -- gstBps, intraState, barOrdersViaQr, allowAutoOpen, hours
  created_at timestamptz not null default now()
);

create table public.staff (
  tenant text not null references public.tenants(slug) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('waiter','kitchen','manager','owner')),
  display_name text not null,
  active boolean not null default true,
  primary key (tenant, user_id)
);

create table public.zones (
  id text primary key,
  tenant text not null references public.tenants(slug) on delete cascade,
  name text not null,
  sort int not null default 0
);

-- ───────── menu (imported from the website JSON) ─────────
create table public.menu_sections (
  id text primary key,
  tenant text not null references public.tenants(slug) on delete cascade,
  side text not null check (side in ('food','drinks')),
  name text not null,
  sort int not null default 0,
  is_bar boolean not null default false
);
create index on public.menu_sections (tenant, side, sort);

create table public.menu_items (
  id text primary key,
  tenant text not null references public.tenants(slug) on delete cascade,
  section_id text not null references public.menu_sections(id) on delete cascade,
  source_name text not null,              -- exact name from the client menu
  description text,
  price_paise int not null check (price_paise >= 0),
  is_veg boolean,
  spicy boolean not null default false,
  chef_special boolean not null default false,
  is_bar boolean not null default false,  -- alcohol: 21+, dine-in only
  photo text,
  photo_unconfirmed boolean not null default false,
  available boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create index on public.menu_items (tenant, section_id, sort);

create table public.packages (
  id text primary key,
  tenant text not null references public.tenants(slug) on delete cascade,
  grp text not null,
  name text not null,
  price_paise int not null check (price_paise >= 0),  -- per guest, as in party.json
  details jsonb not null default '{}'::jsonb,
  sort int not null default 0
);

create table public.specials (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  title text not null,
  body text,
  item_id text references public.menu_items(id) on delete set null,
  active boolean not null default true,
  starts_on date, ends_on date
);

-- ───────── tables & sessions ─────────
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{1,16}$'),
  label text not null,
  zone_id text references public.zones(id) on delete set null,
  seats int not null default 4 check (seats between 1 and 40),
  active boolean not null default true,
  unique (tenant, code)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  table_id uuid not null references public.dining_tables(id) on delete cascade,
  opened_by uuid,            -- staff user, null when auto-opened by the first scan (pilot setting)
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
-- only one open session per table
create unique index one_open_session_per_table on public.table_sessions (table_id) where closed_at is null;

create table public.session_guests (
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  user_id uuid not null,     -- Supabase anonymous or phone user
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ───────── orders ─────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  session_id uuid not null references public.table_sessions(id) on delete restrict,
  guest_user_id uuid not null,
  client_order_id uuid not null,
  status text not null default 'placed' check (status in ('placed','accepted','preparing','ready','served','cancelled')),
  subtotal_paise int not null check (subtotal_paise >= 0),
  cgst_paise int not null default 0,
  sgst_paise int not null default 0,
  igst_paise int not null default 0,
  total_paise int not null check (total_paise >= 0),
  has_bar boolean not null default false,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','counter','failed')),
  pay_ref text,
  pos_status text not null default 'pending' check (pos_status in ('pending','sent','failed','printed')),
  pos_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant, client_order_id)
);
create index on public.orders (tenant, status, created_at desc);
create index on public.orders (session_id);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id text references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot int not null check (price_snapshot >= 0),
  qty int not null check (qty between 1 and 20),
  note text check (char_length(note) <= 140)
);

create table public.service_calls (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  guest_user_id uuid not null,
  kind text not null check (kind in ('waiter','water','bill')),
  status text not null default 'open' check (status in ('open','ack','done')),
  created_at timestamptz not null default now()
);

-- ───────── bookings & leads ─────────
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  user_id uuid,
  guest_name text not null,
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  date date not null,
  time time not null,
  guests int not null check (guests between 1 and 20),
  zone_pref text,
  occasion text,
  note text check (char_length(note) <= 500),
  status text not null default 'requested' check (status in ('requested','confirmed','declined','cancelled')),
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  user_id uuid,
  kind text not null check (kind in ('party','banquet','catering')),
  payload jsonb not null,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  notes text,
  created_at timestamptz not null default now()
);

-- ───────── privacy & audit ─────────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  tenant text not null references public.tenants(slug) on delete cascade,
  user_id uuid not null,
  purpose text not null check (purpose in ('service','whatsapp','offers')),
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant text,
  actor uuid,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);

-- ───────── helpers (security definer, fixed search_path) ─────────
create or replace function public.is_staff(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff s where s.tenant = t and s.user_id = auth.uid() and s.active);
$$;

create or replace function public.in_session(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.session_guests g where g.session_id = sid and g.user_id = auth.uid());
$$;

create or replace function public.session_open(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.table_sessions s where s.id = sid and s.closed_at is null);
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger items_touch before update on public.menu_items for each row execute function public.touch_updated_at();

-- staff may only move orders along the kitchen flow
create or replace function public.check_order_transition() returns trigger language plpgsql as $$
begin
  if new.status <> old.status and not (
    (old.status = 'placed' and new.status in ('accepted','cancelled')) or
    (old.status = 'accepted' and new.status in ('preparing','cancelled')) or
    (old.status = 'preparing' and new.status in ('ready','cancelled')) or
    (old.status = 'ready' and new.status = 'served')
  ) then
    raise exception 'invalid order status change % -> %', old.status, new.status;
  end if;
  return new;
end $$;
create trigger orders_flow before update of status on public.orders for each row execute function public.check_order_transition();

-- ───────── row level security ─────────
alter table public.tenants enable row level security;
alter table public.staff enable row level security;
alter table public.zones enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_items enable row level security;
alter table public.packages enable row level security;
alter table public.specials enable row level security;
alter table public.dining_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.session_guests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.service_calls enable row level security;
alter table public.reservations enable row level security;
alter table public.enquiries enable row level security;
alter table public.consents enable row level security;
alter table public.audit_log enable row level security;

-- public catalogue (anyone, including anonymous guests)
create policy tenants_read on public.tenants for select using (true);
create policy zones_read on public.zones for select using (true);
create policy sections_read on public.menu_sections for select using (true);
create policy items_read on public.menu_items for select using (true);
create policy packages_read on public.packages for select using (true);
create policy specials_read on public.specials for select using (active or public.is_staff(tenant));

-- staff manage their tenant's catalogue and tables
create policy items_staff on public.menu_items for update using (public.is_staff(tenant)) with check (public.is_staff(tenant));
create policy specials_staff on public.specials for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));
create policy staff_read on public.staff for select using (user_id = auth.uid() or public.is_staff(tenant));
create policy tables_staff on public.dining_tables for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));

-- sessions: staff open/close; guests see sessions they joined (joining happens server-side)
create policy sessions_staff on public.table_sessions for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));
create policy sessions_guest on public.table_sessions for select using (public.in_session(id));
create policy members_read on public.session_guests for select using (user_id = auth.uid() or public.in_session(session_id));

-- orders: everyone at the table sees the table bill; staff see and update their tenant; no guest inserts
create policy orders_guest_read on public.orders for select using (public.in_session(session_id));
create policy orders_staff_read on public.orders for select using (public.is_staff(tenant));
create policy orders_staff_update on public.orders for update using (public.is_staff(tenant)) with check (public.is_staff(tenant));
create policy order_items_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (public.in_session(o.session_id) or public.is_staff(o.tenant)))
);

-- service calls: guests in an OPEN session may call; staff handle
create policy calls_guest_insert on public.service_calls for insert with check (
  guest_user_id = auth.uid() and public.in_session(session_id) and public.session_open(session_id)
);
create policy calls_guest_read on public.service_calls for select using (public.in_session(session_id));
create policy calls_staff on public.service_calls for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));

-- bookings & leads: guests read their own; created by the server (validation + rate limit); staff manage
create policy res_own on public.reservations for select using (user_id = auth.uid());
create policy res_staff on public.reservations for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));
create policy enq_own on public.enquiries for select using (user_id = auth.uid());
create policy enq_staff on public.enquiries for all using (public.is_staff(tenant)) with check (public.is_staff(tenant));

-- consents: own rows only
create policy consents_own_read on public.consents for select using (user_id = auth.uid());
create policy consents_own_insert on public.consents for insert with check (user_id = auth.uid());
create policy consents_own_withdraw on public.consents for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_staff on public.audit_log for select using (public.is_staff(tenant));

-- ───────── realtime ─────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.order_items, public.service_calls, public.table_sessions, public.menu_items, public.reservations;
  end if;
end $$;
