// First-party, in-house modules (booking, SMS, reviews, ...). Reads/writes
// apps_catalog and tenant_apps ONLY. Does not import routes/connectors.js
// and shares no function with it — see README.md for why that's a
// requirement here, not a style preference.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/catalog', async (req, res) => {
  const { data, error } = await supabase
    .from('apps_catalog')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ apps: data });
});

router.get('/installed', async (req, res) => {
  const { data, error } = await supabase
    .from('tenant_apps')
    .select('app_id, installed_at, apps_catalog(id, name, description)')
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ apps: data.map(row => ({ ...row.apps_catalog, installed_at: row.installed_at })) });
});

router.post('/:appId/install', async (req, res) => {
  const { data: exists } = await supabase
    .from('apps_catalog')
    .select('id')
    .eq('id', req.params.appId)
    .eq('is_active', true)
    .maybeSingle();
  if (!exists) return res.status(404).json({ error: `Unknown app: ${req.params.appId}` });

  const { error } = await supabase
    .from('tenant_apps')
    .upsert({ tenant_id: req.tenantId, app_id: req.params.appId }, { onConflict: 'tenant_id,app_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ installed: true, app_id: req.params.appId });
});

router.post('/:appId/uninstall', async (req, res) => {
  const { error } = await supabase
    .from('tenant_apps')
    .delete()
    .eq('tenant_id', req.tenantId)
    .eq('app_id', req.params.appId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ installed: false, app_id: req.params.appId });
});

module.exports = router;
