require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { tenantRequired } = require('./middleware/tenantAuth');
const { adminRequired } = require('./middleware/adminAuth');

const app = express();
app.use(cors());
app.use(express.json());

// Tenant-facing — every route here only ever sees req.tenantId.
// More specific path mounted first — otherwise a /api/apps/booking/* request
// would run tenantRequired twice (once falling through the generic router,
// once matching this one) before reaching a handler.
app.use('/api/apps/booking', tenantRequired, require('./routes/apps/booking'));
app.use('/api/apps', tenantRequired, require('./routes/apps'));
app.use('/api/connectors', tenantRequired, require('./routes/connectors'));
app.use('/api/content', tenantRequired, require('./routes/content'));

// Admin-facing — every route here only ever sees req.isAdmin, never a tenant.
app.use('/api/admin/tenants', adminRequired, require('./routes/admin-tenants'));
app.use('/api/admin/apps-catalog', adminRequired, require('./routes/admin-apps-catalog'));
app.use('/api/admin/connectors-catalog', adminRequired, require('./routes/admin-connectors-catalog'));

app.get('/api/whoami', tenantRequired, (req, res) => {
  res.json({ tenantId: req.tenantId, tenantSlug: req.tenantSlug, role: req.tenantRole });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`api-layer-unified listening on :${PORT}`));
