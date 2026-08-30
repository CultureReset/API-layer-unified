-- The Booking app's own tables. Lives entirely inside the "apps" system —
-- nothing here is referenced by connectors_catalog, tenant_connectors, or
-- any Connectors code. Shape is generalized from the real, live booking
-- model already proven in cybercheck-api-database/server.js
-- (fleet_types / rental_time_slots / rental_pricing / rental_addons), keyed
-- by tenant_id instead of the legacy site_id, and additive to
-- 001_init.sql — nothing here alters an existing table.

create table if not exists public.booking_resources (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  name         text not null,
  description  text not null default '',
  image_url    text,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists booking_resources_tenant_idx on public.booking_resources (tenant_id);

create table if not exists public.booking_time_slots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,        -- e.g. "Half Day AM", "All Day"
  is_active   boolean not null default true,
  sort_order  integer not null default 0
);

create index if not exists booking_time_slots_tenant_idx on public.booking_time_slots (tenant_id);

-- price for one resource at one time slot — a real join table, not a JSON blob
create table if not exists public.booking_prices (
  resource_id   uuid not null references public.booking_resources(id) on delete cascade,
  time_slot_id  uuid not null references public.booking_time_slots(id) on delete cascade,
  price         numeric(10,2) not null,
  primary key (resource_id, time_slot_id)
);

create table if not exists public.booking_addons (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  name         text not null,
  description  text not null default '',
  price        numeric(10,2) not null default 0,
  is_active    boolean not null default true
);

create index if not exists booking_addons_tenant_idx on public.booking_addons (tenant_id);

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  resource_id     uuid not null references public.booking_resources(id),
  time_slot_id    uuid not null references public.booking_time_slots(id),
  booking_date    date not null,
  qty             integer not null default 1,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text not null,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at      timestamptz not null default now()
);

create index if not exists bookings_tenant_date_idx on public.bookings (tenant_id, booking_date);

alter table public.booking_resources  enable row level security;
alter table public.booking_time_slots enable row level security;
alter table public.booking_prices     enable row level security;
alter table public.booking_addons     enable row level security;
alter table public.bookings           enable row level security;

revoke all on public.booking_resources, public.booking_time_slots, public.booking_prices,
  public.booking_addons, public.bookings
  from anon, authenticated;
