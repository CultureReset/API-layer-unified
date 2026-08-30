// The one place a slug IS taken from the request — deliberately, because
// this route serves public data to anonymous visitors (a tenant's bio-link
// page), not private data to an authenticated caller. That's the actual
// distinction behind "never take the slug from the request": it protects
// scoping a caller's OWN access, not public read access to public data —
// the same distinction gcr-api-clean's own public entity-detail routes
// rely on. This route is read-only. No route in this file ever writes.

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/:slug', async (req, res) => {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', req.params.slug)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!tenant) return res.status(404).json({ error: 'No such tenant.' });

  const [{ data: profile }, { data: linksSection }] = await Promise.all([
    supabase.from('tenant_profiles').select('category, description, address, phone, email, hours, photo_url')
      .eq('tenant_id', tenant.id).maybeSingle(),
    supabase.from('content_sections').select('data').eq('tenant_id', tenant.id).eq('section_type', 'links').maybeSingle(),
  ]);

  res.json({
    tenant: { slug: tenant.slug, name: tenant.name },
    profile: profile || null,
    links: (linksSection?.data?.items) || [],
  });
});

module.exports = router;
