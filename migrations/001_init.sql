-- api-layer-unified — initial schema.
--
-- Runs against a Supabase project you create and own for THIS platform.
-- Nothing here references, joins, or depends on any table from any other
-- CultureReset repo's database — this is a new, independent project.
--
-- Auth is Supabase Auth (auth.users), not a hand-rolled password table. Two
-- separate roles sit on top of it, deliberately never merged:
--   - tenant_members: which auth.users account belongs to which tenant
--   - platform_admins: which auth.users account is a platform operator
-- A user can be in neither, either, or (for testing) both — but the two
-- checks are independent code paths (see middleware/tenantAuth.js and
-- middleware/adminAuth.js), so nothing about being an admin implies tenant
-- access or vice versa.
--
-- Apps and Connectors are two fully separate systems below, each with its
-- own catalog table and its own per-tenant install table. Neither
-- references the other. A row in tenant_apps never appears in
-- tenant_connectors and the reverse. This is deliberate, not an oversight —
-- see README.md.

create extension if not exists pgcrypto;

/* ── tenants ─────────────────────────────────────────────────────────── */

create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members (user_id);

/* ── platform admins — separate identity, never joined to tenants ──────── */

create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

/* ══════════════════════════════════════════════════════════════════════
   APPS — first-party, in-house modules (booking, SMS, reviews, ...)
   Completely separate from Connectors below. No shared table, no shared
   foreign key, no code path that reads both in one query.
   ══════════════════════════════════════════════════════════════════════ */

create table if not exists public.apps_catalog (
  id           text primary key,       -- e.g. 'booking', 'sms', 'reviews'
  name         text not null,
  description  text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Install lifecycle, not a plain join row — pattern pulled from
-- cybercheck-cloud/db/003_installations.sql: "installed" and "uninstalled"
-- are different facts that both deserve to still be true tomorrow. A hard
-- DELETE on uninstall would erase that an app was ever used; this keeps the
-- row and marks it instead, so history survives and reinstalling is a real,
-- observable event rather than an insert that looks like the first one ever.
create table if not exists public.tenant_apps (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  app_id         text not null references public.apps_catalog(id) on delete cascade,
  status         text not null default 'installed' check (status in ('installed', 'uninstalled')),
  installed_at   timestamptz not null default now(),
  uninstalled_at timestamptz,

  constraint tenant_apps_uninstalled_records_when
    check (status <> 'uninstalled' or uninstalled_at is not null)
);

-- Only one LIVE install per tenant per app — past installs/uninstalls of the
-- same app stay in the table as history rather than being overwritten.
create unique index if not exists tenant_apps_one_live_idx
  on public.tenant_apps (tenant_id, app_id) where status = 'installed';

create index if not exists tenant_apps_tenant_idx on public.tenant_apps (tenant_id) where status = 'installed';

/* ══════════════════════════════════════════════════════════════════════
   CONNECTORS — third-party tools (Composio-backed or otherwise).
   Completely separate from Apps above.
   ══════════════════════════════════════════════════════════════════════ */

create table if not exists public.connectors_catalog (
  id             text primary key,     -- e.g. 'google_calendar', 'quickbooks'
  name           text not null,
  description    text not null default '',
  provider       text not null default 'composio',
  composio_app   text,                 -- Composio app key, informational
  integration_id text,                 -- Composio integration id
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Same install-lifecycle discipline as tenant_apps above. 'disconnected' is
-- a status, not a deleted row — same reasoning: a tenant unhooking Google
-- Calendar and reconnecting it later is a real, auditable sequence of
-- events, not two unrelated inserts with no memory of the first one.
create table if not exists public.tenant_connectors (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  connector_id    text not null references public.connectors_catalog(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disconnected')),
  account_ref     text,
  connected_at    timestamptz,
  disconnected_at timestamptz,
  created_at      timestamptz not null default now(),

  constraint tenant_connectors_disconnected_records_when
    check (status <> 'disconnected' or disconnected_at is not null)
);

create unique index if not exists tenant_connectors_one_live_idx
  on public.tenant_connectors (tenant_id, connector_id) where status <> 'disconnected';

create index if not exists tenant_connectors_tenant_idx on public.tenant_connectors (tenant_id) where status <> 'disconnected';

/* ══════════════════════════════════════════════════════════════════════
   CONTENT SECTIONS — generic per-tenant editable content, a core platform
   feature (not gated behind an app install, unlike Apps/Connectors above).
   ══════════════════════════════════════════════════════════════════════ */

create table if not exists public.content_sections (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  section_type text not null,
  sort_order   integer not null default 0,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create index if not exists content_sections_tenant_idx on public.content_sections (tenant_id, sort_order);

/* ── row level security ─────────────────────────────────────────────────
   This API talks to Supabase with the service role key, which bypasses
   RLS by design — same pattern as every other CultureReset repo. RLS is
   still enabled with no policies so a leaked anon/authenticated key can
   never read or write these tables directly from a browser. */

alter table public.tenants            enable row level security;
alter table public.tenant_members     enable row level security;
alter table public.platform_admins    enable row level security;
alter table public.apps_catalog       enable row level security;
alter table public.tenant_apps        enable row level security;
alter table public.connectors_catalog enable row level security;
alter table public.tenant_connectors  enable row level security;
alter table public.content_sections   enable row level security;

revoke all on public.tenants, public.tenant_members, public.platform_admins,
  public.apps_catalog, public.tenant_apps, public.connectors_catalog,
  public.tenant_connectors, public.content_sections
  from anon, authenticated;
