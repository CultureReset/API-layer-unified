// Third-party tools (Composio-backed or otherwise). Reads/writes
// connectors_catalog and tenant_connectors ONLY. Deliberately not a
// generalized version of routes/apps.js — no shared "install a thing"
// helper between the two files. Apps and Connectors are different systems
// that happen to both belong to a tenant; that's the only thing about them
// that's the same.
//
// connect/disconnect update a status, same lifecycle reasoning as
// routes/apps.js — see migrations/001_init.sql.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/catalog', async (req, res) => {
  const { data, error } = await supabase
    .from('connectors_catalog')
    .select('id, name, description, provider')
    .eq('is_active', true)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ connectors: data });
});

router.get('/installed', async (req, res) => {
  const { data, error } = await supabase
    .from('tenant_connectors')
    .select('connector_id, status, connected_at, connectors_catalog(id, name, description, provider)')
    .eq('tenant_id', req.tenantId)
    .neq('status', 'disconnected');
  if (error) return res.status(500).json({ error: error.message });
  res.json({
    connectors: data.map(row => ({ ...row.connectors_catalog, status: row.status, connected_at: row.connected_at })),
  });
});

// Connecting is a two-step handshake in the real Composio flow (this route
// records intent; the actual OAuth round-trip happens in whatever route
// handles the provider's callback, added when a real Composio integration
// id exists for a given connector).
router.post('/:connectorId/connect', async (req, res) => {
  const { data: exists } = await supabase
    .from('connectors_catalog')
    .select('id')
    .eq('id', req.params.connectorId)
    .eq('is_active', true)
    .maybeSingle();
  if (!exists) return res.status(404).json({ error: `Unknown connector: ${req.params.connectorId}` });

  const { data: existingRow } = await supabase
    .from('tenant_connectors')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('connector_id', req.params.connectorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const patch = { status: 'pending', disconnected_at: null };
  const { error } = existingRow
    ? await supabase.from('tenant_connectors').update(patch).eq('id', existingRow.id)
    : await supabase.from('tenant_connectors').insert({ tenant_id: req.tenantId, connector_id: req.params.connectorId, ...patch });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ status: 'pending', connector_id: req.params.connectorId });
});

router.post('/:connectorId/disconnect', async (req, res) => {
  const { error } = await supabase
    .from('tenant_connectors')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('tenant_id', req.tenantId)
    .eq('connector_id', req.params.connectorId)
    .neq('status', 'disconnected');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ status: 'disconnected', connector_id: req.params.connectorId });
});

module.exports = router;
