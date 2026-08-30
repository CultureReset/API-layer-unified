// Admin can edit ANY tenant's listing — the thing a tenant's own
// routes/profile.js structurally cannot do (it only ever touches
// req.tenantId). This is the Chamber-of-Commerce white-label surface:
// browse every listing, edit any of them, from one admin screen.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data: tenants, error } = await supabase.from('tenants').select('id, slug, name');
  if (error) return res.status(500).json({ error: error.message });

  const { data: profiles } = await supabase.from('tenant_profiles').select('*');
  const byTenant = new Map((profiles || []).map(p => [p.tenant_id, p]));

  res.json({
    listings: tenants.map(t => ({
      tenant_id: t.id,
      slug: t.slug,
      name: t.name,
      ...(byTenant.get(t.id) || {}),
    })),
  });
});

router.patch('/:tenantId', async (req, res) => {
  const { category, description, address, phone, email, hours, photo_url } = req.body || {};
  const { data, error } = await supabase
    .from('tenant_profiles')
    .upsert({
      tenant_id: req.params.tenantId,
      category, description, address, phone, email, hours, photo_url,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

module.exports = router;
