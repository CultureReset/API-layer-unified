// EXTRACTED FROM: the counter-example found in cybercheck-api-database's
// webhook handling (routes/stripe.js, routes/webhooks.js) — when
// STRIPE_WEBHOOK_SECRET isn't set, that code falls back to trusting the
// raw body with NO signature check, instead of refusing to run. Same class
// of bug as Twilio/Sendblue webhooks there having no verification at all.
//
// WHAT IT DOES: one small helper enforcing the actual rule: missing
// security-relevant config must produce a hard failure (503, refuse to
// start, throw), never a silent downgrade to "skip the check." This
// platform's own db.js already follows this rule for Supabase credentials
// (throws at startup rather than falling back to fake data) — this is that
// same discipline, named, so it's applied on purpose everywhere a future
// feature reads a security-relevant env var, not by accident once.
//
// STATUS: a tiny, standalone helper. Use it any time a new route reads a
// secret that gates a security check (a webhook secret, a signing key) —
// call requireConfigured() before running the check, never after.

function requireConfigured(value, name) {
  if (!value) {
    throw new Error(`${name} is not configured — refusing to run with this check disabled.`);
  }
  return value;
}

module.exports = { requireConfigured };
