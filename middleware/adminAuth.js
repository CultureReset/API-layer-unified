// Same Supabase Auth verification step as tenantAuth.js — that part is
// unavoidably shared, because there is only one real identity provider
// (Supabase Auth) and re-verifying a session token two different ways would
// be the actual security hole. What's NOT shared: this checks
// platform_admins, never tenant_members, and sets req.isAdmin with no
// req.tenantId anywhere in this file. An admin session and a tenant session
// are different rows in different tables; nothing here can conflate them.

const supabase = require('../db');

async function adminRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(header.slice(7));
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'That session is not valid.' });
  }

  const { data: admin, error: adminError } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (adminError) return res.status(500).json({ error: adminError.message });
  if (!admin) return res.status(403).json({ error: 'This account is not a platform admin.' });

  req.userId = userData.user.id;
  req.isAdmin = true;
  next();
}

module.exports = { adminRequired };
