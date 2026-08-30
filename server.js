require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { tenantRequired } = require('./middleware/tenantAuth');
const { adminRequired } = require('./middleware/adminAuth');
const { ApiError } = require('./lib/errors');

const app = express();
app.use(cors());
app.use(express.json());

// Rate-limited by the caller's own credential (hashed), not IP — an IP-based
// limit punishes every tenant sharing infrastructure (a corporate NAT, a
// proxy) as one caller. No credential (an anonymous /api/public/:slug
// request) falls back to IP, which is the right scope for that case.
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const credential = (req.headers.authorization || '').trim();
    if (credential) return crypto.createHash('sha256').update(credential).digest('hex').slice(0, 32);
    return req.ip;
  },
}));

// One broken route file logs a warning at boot instead of crashing the
// entire server — every route file here is independently owned, and a typo
// in one shouldn't take every other route down with it. The loader is a
// function, not the require() result, specifically so a throw during
// require() (a syntax error, a bad import) happens INSIDE the try — passing
// the already-evaluated require() as an argument would throw before mount()
// is even entered, and this same-day mistake is exactly the kind of thing
// this function exists to guard against.
function mount(path, middleware, loader) {
  try {
    app.use(path, middleware, loader());
  } catch (e) {
    console.error(`Failed to mount ${path}:`, e.message);
  }
}

// Tenant-facing — every route here only ever sees req.tenantId.
// More specific path mounted first — otherwise a /api/apps/booking/* request
// would run tenantRequired twice (once falling through the generic router,
// once matching this one) before reaching a handler.
mount('/api/apps/booking', tenantRequired, () => require('./routes/apps/booking'));
mount('/api/apps', tenantRequired, () => require('./routes/apps'));
mount('/api/connectors', tenantRequired, () => require('./routes/connectors'));
mount('/api/content', tenantRequired, () => require('./routes/content'));
mount('/api/profile', tenantRequired, () => require('./routes/profile'));

// Admin-facing — every route here only ever sees req.isAdmin, never a tenant.
mount('/api/admin/tenants', adminRequired, () => require('./routes/admin-tenants'));
mount('/api/admin/apps-catalog', adminRequired, () => require('./routes/admin-apps-catalog'));
mount('/api/admin/connectors-catalog', adminRequired, () => require('./routes/admin-connectors-catalog'));
mount('/api/admin/directory', adminRequired, () => require('./routes/admin-directory'));

// Public — no auth. Read-only. See routes/public.js for why a slug is
// accepted from the request here and nowhere else.
mount('/api/public', (req, res, next) => next(), () => require('./routes/public'));

app.get('/api/whoami', tenantRequired, (req, res) => {
  res.json({ tenantId: req.tenantId, tenantSlug: req.tenantSlug, role: req.tenantRole });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// One error shape for the whole API. Existing routes still return their own
// res.status(...).json({error}) inline (that's not broken — it's just not
// yet migrated); this is the safety net for anything that throws instead,
// and the standard new routes should follow going forward: throw an
// ApiError (lib/errors.js) inside an asyncHandler-wrapped handler
// (lib/asyncHandler.js) rather than hand-writing a status check.
app.use((err, req, res, next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`api-layer-unified listening on :${PORT}`));
