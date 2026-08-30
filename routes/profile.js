// A tenant's own directory listing. Scoped by req.tenantId only — the same
// rule as every other tenant-facing route in this repo.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tenant_profiles')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data || { tenant_id: req.tenantId } });
});

router.patch('/', async (req, res) => {
  const { category, description, address, phone, email, hours, photo_url } = req.body || {};
  const { data, error } = await supabase
    .from('tenant_profiles')
    .upsert({
      tenant_id: req.tenantId,
      category, description, address, phone, email, hours, photo_url,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

module.exports = router;
