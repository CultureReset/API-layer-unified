// First-party, in-house modules (booking, SMS, reviews, ...). Reads/writes
// apps_catalog and tenant_apps ONLY. Does not import routes/connectors.js
// and shares no function with it — see README.md for why that's a
// requirement here, not a style preference.
//
// Install/uninstall update a status, never insert-then-delete — see the
// comment on tenant_apps in migrations/001_init.sql for why (pulled from
// cybercheck-cloud's installation-lifecycle model).

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
    .eq('tenant_id', req.tenantId)
    .eq('status', 'installed');
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

  // Any prior row (installed or previously uninstalled) for this tenant+app
  // is reactivated rather than duplicated — the partial unique index in
  // migrations/001_init.sql only allows one row with status='installed' per
  // (tenant_id, app_id), so history from an earlier uninstall stays intact.
  const { data: existingRow } = await supabase
    .from('tenant_apps')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('app_id', req.params.appId)
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const patch = { status: 'installed', installed_at: new Date().toISOString(), uninstalled_at: null };
  const { error } = existingRow
    ? await supabase.from('tenant_apps').update(patch).eq('id', existingRow.id)
    : await supabase.from('tenant_apps').insert({ tenant_id: req.tenantId, app_id: req.params.appId, ...patch });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ installed: true, app_id: req.params.appId });
});

router.post('/:appId/uninstall', async (req, res) => {
  const { error } = await supabase
    .from('tenant_apps')
    .update({ status: 'uninstalled', uninstalled_at: new Date().toISOString() })
    .eq('tenant_id', req.tenantId)
    .eq('app_id', req.params.appId)
    .eq('status', 'installed');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ installed: false, app_id: req.params.appId });
});

module.exports = router;
