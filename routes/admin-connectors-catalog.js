// Defines what connectors CAN be connected, platform-wide. Only this file
// writes to connectors_catalog — routes/connectors.js (tenant-facing) only
// ever reads it. Not merged with admin-apps-catalog.js — same reasoning
// as the split between routes/apps.js and routes/connectors.js.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('connectors_catalog').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ connectors: data });
});

router.post('/', async (req, res) => {
  const { id, name, description, provider, composio_app, integration_id } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name are required.' });
  const { data, error } = await supabase
    .from('connectors_catalog')
    .insert({
      id, name,
      description: description || '',
      provider: provider || 'composio',
      composio_app: composio_app || null,
      integration_id: integration_id || null,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ connector: data });
});

router.delete('/:connectorId', async (req, res) => {
  const { error } = await supabase
    .from('connectors_catalog')
    .update({ is_active: false })
    .eq('id', req.params.connectorId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ retired: req.params.connectorId });
});

module.exports = router;
