// Generic per-tenant content sections — a core platform feature, not gated
// behind an app or connector install. Both the future public-facing page and
// the dashboard editor read/write through this one endpoint, so they can
// never drift into two different shapes the way an earlier prototype's
// source material did (see README.md).

const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('content_sections')
    .select('id, section_type, sort_order, data')
    .eq('tenant_id', req.tenantId)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sections: data });
});

router.post('/', async (req, res) => {
  const { section_type, data } = req.body || {};
  if (!section_type) return res.status(400).json({ error: 'section_type is required.' });

  const { count } = await supabase
    .from('content_sections')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', req.tenantId);

  const { data: inserted, error } = await supabase
    .from('content_sections')
    .insert({ tenant_id: req.tenantId, section_type, sort_order: count || 0, data: data || {} })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ section: inserted });
});

router.patch('/sections/:id', async (req, res) => {
  const { data: updated, error } = await supabase
    .from('content_sections')
    .update({ data: req.body || {}, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId) // scoped so one tenant can never patch another's section id
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!updated) return res.status(404).json({ error: 'No such section for this tenant.' });
  res.json({ section: updated });
});

module.exports = router;
