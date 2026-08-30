-- The directory listing every tenant gets — name, category, description,
-- contact, hours, photo. This is what makes a tenant "white-labelable" as a
-- directory entry (the Chamber-of-Commerce use case): one admin-editable
-- record per tenant, separate from content_sections (which is free-form
-- page content, not structured listing fields a directory grid can sort or
-- filter on).

create table if not exists public.tenant_profiles (
  tenant_id    uuid primary key references public.tenants(id) on delete cascade,
  category     text,
  description  text,
  address      text,
  phone        text,
  email        text,
  hours        text,
  photo_url    text,
  updated_at   timestamptz not null default now()
);

create index if not exists tenant_profiles_category_idx on public.tenant_profiles (category);

alter table public.tenant_profiles enable row level security;
revoke all on public.tenant_profiles from anon, authenticated;
