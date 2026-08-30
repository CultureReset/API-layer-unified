// Gate for an app's own feature routes: installing an app in tenant_apps
// isn't just a UI toggle, it's the actual authorization check. Used by
// routes/apps/booking.js and any future app's route file — this is a
// generic AUTH gate, not app business logic, which is why it's shared the
// same way tenantAuth/adminAuth are: verifying "is this installed" once,
// correctly, beats every app file re-implementing the same query.

const supabase = require('../db');

function requireAppInstalled(appId) {
  return async (req, res, next) => {
    const { data, error } = await supabase
      .from('tenant_apps')
      .select('app_id')
      .eq('tenant_id', req.tenantId)
      .eq('app_id', appId)
      .eq('status', 'installed')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(403).json({ error: `The "${appId}" app is not installed for this tenant.` });
    next();
  };
}

module.exports = { requireAppInstalled };
