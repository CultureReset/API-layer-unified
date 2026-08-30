// The cross-tenant view. Structurally impossible from the tenant side —
// routes/apps.js and routes/connectors.js only ever filter by req.tenantId,
// there is no tenant-facing route that takes a list.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data: tenants, error } = await supabase.from('tenants').select('id, slug, name, created_at');
  if (error) return res.status(500).json({ error: error.message });

  const { data: appInstalls } = await supabase.from('tenant_apps').select('tenant_id, app_id');
  const { data: connectorInstalls } = await supabase.from('tenant_connectors').select('tenant_id, connector_id, status');

  const withInstalls = tenants.map(t => ({
    ...t,
    apps: (appInstalls || []).filter(r => r.tenant_id === t.id).map(r => r.app_id),
    connectors: (connectorInstalls || []).filter(r => r.tenant_id === t.id).map(r => ({ id: r.connector_id, status: r.status })),
  }));

  res.json({ tenants: withInstalls });
});

module.exports = router;
