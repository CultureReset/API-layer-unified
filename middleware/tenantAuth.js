// Real auth: the bearer token is a Supabase Auth access token, verified
// against Supabase itself (supabase.auth.getUser), never a hand-rolled JWT
// and never a hardcoded token map. Which tenant the caller acts as comes
// from tenant_members, server-side — never from the URL, query string, or
// body. Carried over from gcr-api-clean/middleware/ownerAuth.js's rule,
// because that rule is correct, not because this code is shared with it —
// it isn't; this file has no import from any other repo.

const supabase = require('../db');

async function tenantRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(header.slice(7));
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'That session is not valid.' });
  }

  const { data: membership, error: memberError } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, tenants(slug)')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();

  if (memberError) return res.status(500).json({ error: memberError.message });
  if (!membership) return res.status(403).json({ error: 'This account is not linked to a tenant.' });

  req.userId = userData.user.id;
  req.tenantId = membership.tenant_id;
  req.tenantSlug = membership.tenants?.slug;
  req.tenantRole = membership.role;
  next();
}

module.exports = { tenantRequired };
