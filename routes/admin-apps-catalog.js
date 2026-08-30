// Defines what apps CAN be installed, platform-wide. Only this file writes
// to apps_catalog — routes/apps.js (tenant-facing) only ever reads it.
// Deliberately not merged with admin-connectors-catalog.js below, even
// though the CRUD shape looks similar — see README.md.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('apps_catalog').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ apps: data });
});

router.post('/', async (req, res) => {
  const { id, name, description } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name are required.' });
  const { data, error } = await supabase
    .from('apps_catalog')
    .insert({ id, name, description: description || '' })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ app: data });
});

router.delete('/:appId', async (req, res) => {
  const { error } = await supabase.from('apps_catalog').update({ is_active: false }).eq('id', req.params.appId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ retired: req.params.appId });
});

module.exports = router;
