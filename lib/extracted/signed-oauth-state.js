// EXTRACTED FROM: gcr-api-clean/routes/google-business.js (the /auth step
// and its callback), contrasted with the unsigned-base64-JSON `state` used
// in that same repo's own routes/stripe.js and routes/square.js, and with
// the identical unsigned pattern found (and exploitable) in
// cybercheck-api-database's routes/stripe.js, routes/square.js, and
// routes/google-business.js — confirmed there as a real account-takeover
// vulnerability: an attacker completes their OWN OAuth consent, forges
// `state` with a victim's tenant id, hits the callback directly (no
// session required), and the victim's payment routing gets hijacked to the
// attacker's account.
//
// WHAT IT DOES: signs the OAuth `state` param with a short expiry and
// verifies (not just decodes) it on callback, so state can't be forged —
// only the platform that minted it, with its own secret, could have
// produced a state that verifies.
//
// STATUS: standalone, not wired into any route — this platform's
// Connectors system doesn't do real OAuth yet (routes/connectors.js just
// records intent as "pending"). Wire this in the moment a real OAuth
// handshake gets built, instead of reaching for the unsigned-JSON shortcut
// every other repo in this sweep independently reached for and regretted.

const jwt = require('jsonwebtoken');

function signOAuthState(payload, secret, expiresIn = '15m') {
  return jwt.sign(payload, secret, { expiresIn });
}

// Throws if the state is missing, expired, or tampered with — the caller
// should treat any throw as "reject this callback," never fall back to
// reading the payload anyway.
function verifyOAuthState(state, secret) {
  return jwt.verify(state, secret);
}

module.exports = { signOAuthState, verifyOAuthState };
