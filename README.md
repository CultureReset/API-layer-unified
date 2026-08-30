# api-layer-unified

The one API for this platform. Standalone — no shared code, no shared
database, and no dependency of any kind on any other CultureReset repo.
Everything a caller needs is issued by this service or by your own Supabase
project; nothing is pulled in from `gcr-api-clean`, `cybercheck-api-database`,
or any other repo.

## Install lifecycle, pulled from cybercheck-cloud

`tenant_apps` and `tenant_connectors` track `installed`/`uninstalled` (and
`pending`/`connected`/`error`/`disconnected` for connectors) as a status on a
persistent row, not an insert-then-delete. This is pulled directly from
`cybercheck-cloud/db/003_installations.sql`'s installation model — "a hard
DELETE on uninstall erases that an app was ever used," in that repo's own
words. A partial unique index (`... where status = 'installed'`) still
guarantees only one live install per tenant per app; reinstalling reactivates
the same lineage instead of creating an unrelated second row.

## Why Apps and Connectors are two separate systems, not one

"Apps" are first-party modules you build yourselves (booking, SMS, reviews).
"Connectors" are third-party tools a tenant links in (Composio-backed OAuth
integrations, or others later). They are kept structurally separate on
purpose:

- Two catalog tables (`apps_catalog`, `connectors_catalog`), two install
  tables (`tenant_apps`, `tenant_connectors`) — no shared table, no foreign
  key between them.
- Two route files per side (`routes/apps.js` / `routes/connectors.js`,
  `routes/admin-apps-catalog.js` / `routes/admin-connectors-catalog.js`) —
  no shared "generic install" helper. If Connectors' Composio integration
  breaks, Apps' code is untouched — not just untouched at runtime, untouched
  in the source, because there's no file either one imports from the other.

The only thing that's genuinely shared is tenant/admin identity
(`middleware/tenantAuth.js`, `middleware/adminAuth.js`) — because a tenant is
a tenant regardless of which system it's using, and re-implementing "verify
this Supabase session" twice would be the actual security hole.

## Auth

Real Supabase Auth, not a hand-rolled token scheme. A caller signs in with
Supabase Auth (from either dashboard repo) and sends the resulting access
token as `Authorization: Bearer <token>`. This API verifies it with
`supabase.auth.getUser()` — never decodes a JWT itself — then:

- `middleware/tenantAuth.js` looks the user up in `tenant_members` to find
  their tenant. No tenant id is ever accepted from a URL, query string, or
  request body.
- `middleware/adminAuth.js` looks the user up in `platform_admins` instead.
  A tenant session can never pass this check; an admin session is never
  assumed to belong to any tenant.

## Setup

1. Create a new Supabase project (Supabase dashboard → New Project). Do not
   reuse an existing CultureReset project — this platform is independent.
2. Run `migrations/001_init.sql` against it (Supabase SQL editor, or
   `psql "$DATABASE_URL" -f migrations/001_init.sql`).
3. Copy `.env.example` to `.env` and fill in your project's URL and service
   role key.
4. `npm install && npm start` — listens on `:4000`.
5. Seed at least one row in `apps_catalog` / `connectors_catalog` via
   `POST /api/admin/apps-catalog` / `POST /api/admin/connectors-catalog`
   (needs an admin account — add your user's id to `platform_admins` once
   after signing up through Supabase Auth), and add a tenant via a row in
   `tenants` + `tenant_members` (needs a user id already signed up).

## Routes

| Path | Auth | Purpose |
|---|---|---|
| `GET /api/public/:slug` | **none** | Public directory listing + link-tree data for one tenant — the only route in this repo that takes an identifier from the URL, because it's the only route serving public data to an anonymous visitor rather than private data to an authenticated caller |
| `GET/PATCH /api/profile` | tenant | This tenant's own directory listing (category, description, hours, photo) |
| `GET/PATCH /api/admin/directory` \| `/:tenantId` | admin | Browse every tenant's listing, edit any of them — the Chamber-of-Commerce white-label surface |
| `GET /api/apps/catalog` | tenant | Full app catalog |
| `GET /api/apps/installed` | tenant | This tenant's installed apps |
| `POST /api/apps/:id/install` \| `/uninstall` | tenant | Install/remove an app |
| `GET /api/connectors/catalog` | tenant | Full connector catalog |
| `GET /api/connectors/installed` | tenant | This tenant's connected tools |
| `POST /api/connectors/:id/connect` \| `/disconnect` | tenant | Connect/remove a connector |
| `GET /api/content` \| `POST /api/content` \| `PATCH /api/content/sections/:id` | tenant | Generic content sections |
| `GET /api/admin/tenants` | admin | Every tenant + what each has installed |
| `GET/POST/DELETE /api/admin/apps-catalog` | admin | Define what apps exist |
| `GET/POST/DELETE /api/admin/connectors-catalog` | admin | Define what connectors exist |

## What's real here vs. what's still yours to do

Real: Supabase Auth verification, tenant/admin separation, the full
apps/connectors/content data model and CRUD, row-level security locking the
tables to the service role only.

Not yet built: the actual Composio OAuth handshake (the `connect` route
currently just records intent as `pending` — the provider callback that
flips it to `connected` is provider-specific and needs your Composio API
keys), and the concrete logic inside any given app (booking/SMS/reviews are
catalog entries here, not implemented features — this layer is the
platform, not the feature code).
