# Extracted patterns

Every file in this directory is one pattern, pulled from one place, verified
before being trusted. Each file's header states exactly where it came from
and what it does — read the header, not this index, for the real detail.
This file is just the map.

None of these are wired into `server.js` unless the header says so under
"Status." Extraction and integration are two different steps on purpose:
a pattern lives here once it's proven sound in isolation, and gets wired
into a real route only when a real route needs it — so nothing sits
half-applied in the middle of working code.

| File | Pulled from | What it is | Status |
|---|---|---|---|
| `signed-oauth-state.js` | `gcr-api-clean/routes/google-business.js` | Signed, short-lived OAuth `state` param | Standalone, ready to wire into a real OAuth flow when Connectors gets one |
| `webhook-signature.js` | `gcr-api-clean/routes/meta-webhook.js` | HMAC webhook verification, fail-closed | Standalone |
| `credential-vault.js` | `gcr-api-clean/routes/stripe.js` (correct version — `cybercheck-api-database`'s copy has a real bug, noted in the header) | AES-256-GCM encrypt/decrypt for per-tenant secrets | Standalone |
| `identifier-whitelist.js` | `cybercheck-cloud/src/appdata.js` | Defense-in-depth gate before any value reaches dynamic SQL | Standalone — this repo doesn't build dynamic SQL today, kept for when a feature needs it |
| `transactional-outbox.js` | `cybercheck-orchestrator/src/kernel/events.js` | Tenant-scoped event emit/drain with per-subscriber failure isolation | Standalone, not wired — no feature needs cross-app events yet |
| `grants-policy.js` | `cybercheck-orchestrator/src/kernel/policy.js` | Per-seat permission grants that override a role default | Standalone — this repo's owner/staff model doesn't need per-seat grants yet |
| `provider-slot-registry.js` | `cybercheck-orchestrator/src/kernel/providers.js` | Contract-checked, tenant-overridable provider slots | Standalone |
| `ai-provider-router.js` | `gcr-api-clean/utils/ai-provider.js` + `cybercheck-orchestrator/src/kernel/router.js` | DB-configured AI provider routing with scored fallback | Standalone — no AI feature exists in this platform yet |
| `tokenized-scoped-link.js` | `gcr-api-clean/routes/update-link.js` | Random-token + expiry, loginless scoped access | Standalone |
| `audit-log.js` | `gcr-api-clean/lib/edit-log.js` | Audit writes that never fail the write they describe | Standalone |
| `external-api-client.js` | `gcr-api-clean/lib/composioClient.js` | Third-party API wrapper: safe errors, bounded pagination | Standalone |
| `csv-parser.js` | `Admin-dashboard-main/src/lib/csv.js` | Quoted-field CSV parser, handles embedded newlines | Tested against real edge cases below |
| `tenant-memory-store.js` | `gcr-api-clean/lib/touristMemory.js` | Category/key/value durable memory for an AI agent | Standalone — no AI agent exists in this platform yet |
| `fail-closed-config.js` | `gcr-api-clean/routes/stripe.js` webhook handling (as a counter-example) | The rule: missing config must 503, never silently skip a security check | Doc + a tiny helper |

More to follow — this is the first batch, not the full set.
