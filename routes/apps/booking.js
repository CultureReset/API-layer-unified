// The Booking app's real feature routes — resources, time slots, prices,
// addons, and bookings themselves. Gated on the "booking" app actually
// being installed. Lives under routes/apps/ because it's app-specific
// feature code, not the generic install/catalog logic in routes/apps.js
// one directory up (which stays generic across every app, forever).

const express = require('express');
const router = express.Router();
const supabase = require('../../db');
const { requireAppInstalled } = require('../../lib/requireApp');

router.use(requireAppInstalled('booking'));

router.get('/resources', async (req, res) => {
  const { data, error } = await supabase
    .from('booking_resources')
    .select('id, name, description, image_url, sort_order, booking_prices(time_slot_id, price)')
    .eq('tenant_id', req.tenantId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ resources: data });
});

router.post('/resources', async (req, res) => {
  const { name, description, image_url } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const { data, error } = await supabase
    .from('booking_resources')
    .insert({ tenant_id: req.tenantId, name, description: description || '', image_url: image_url || null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ resource: data });
});

router.get('/time-slots', async (req, res) => {
  const { data, error } = await supabase
    .from('booking_time_slots')
    .select('id, name')
    .eq('tenant_id', req.tenantId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ time_slots: data });
});

router.post('/time-slots', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const { data, error } = await supabase
    .from('booking_time_slots')
    .insert({ tenant_id: req.tenantId, name })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ time_slot: data });
});

router.post('/resources/:resourceId/price', async (req, res) => {
  const { time_slot_id, price } = req.body || {};
  if (!time_slot_id || price == null) return res.status(400).json({ error: 'time_slot_id and price are required.' });

  // Confirm both rows belong to this tenant before writing a price between
  // them — otherwise a resource id from another tenant would silently work.
  const [{ data: resource }, { data: slot }] = await Promise.all([
    supabase.from('booking_resources').select('id').eq('id', req.params.resourceId).eq('tenant_id', req.tenantId).maybeSingle(),
    supabase.from('booking_time_slots').select('id').eq('id', time_slot_id).eq('tenant_id', req.tenantId).maybeSingle(),
  ]);
  if (!resource || !slot) return res.status(404).json({ error: 'No such resource or time slot for this tenant.' });

  const { error } = await supabase
    .from('booking_prices')
    .upsert({ resource_id: req.params.resourceId, time_slot_id, price }, { onConflict: 'resource_id,time_slot_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ resource_id: req.params.resourceId, time_slot_id, price });
});

router.get('/bookings', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, resource_id, time_slot_id, booking_date, qty, customer_name, customer_phone, status, booking_resources(name)')
    .eq('tenant_id', req.tenantId)
    .order('booking_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data });
});

router.post('/bookings', async (req, res) => {
  const { resource_id, time_slot_id, booking_date, qty, customer_name, customer_phone, customer_email } = req.body || {};
  if (!resource_id || !time_slot_id || !booking_date || !customer_name || !customer_phone || !customer_email) {
    return res.status(400).json({ error: 'resource_id, time_slot_id, booking_date, customer_name, customer_phone, and customer_email are required.' });
  }

  const { data: resource } = await supabase
    .from('booking_resources').select('id').eq('id', resource_id).eq('tenant_id', req.tenantId).maybeSingle();
  if (!resource) return res.status(404).json({ error: 'No such resource for this tenant.' });

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      tenant_id: req.tenantId, resource_id, time_slot_id, booking_date,
      qty: qty || 1, customer_name, customer_phone, customer_email,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ booking: data });
});

module.exports = router;
