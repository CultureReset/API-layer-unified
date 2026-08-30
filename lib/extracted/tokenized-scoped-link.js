// EXTRACTED FROM: gcr-api-clean/routes/update-link.js — a random token +
// expiry, stored server-side, validated by one middleware in front of
// every route scoped to it. Same underlying idea as the "magic link"
// pattern also found in cybercheck-api-database's daily-update links,
// review-submission links, and waiver links.
//
// WHAT IT DOES: gives a non-technical person (a customer, a temp staff
// member) a scoped, temporary, loginless way to do ONE thing via a link
// (fill out a form, confirm a booking) without an account.
//
// STATUS: standalone, not wired in. No feature needs a loginless link yet.
// The token-generation and verification halves are separated on purpose —
// generateScopedToken() at creation time, verifyScopedToken() as
// middleware — so wiring this in later is "add a table row + one
// middleware," not new design work.

const crypto = require('crypto');

function generateScopedToken() {
  return crypto.randomBytes(24).toString('hex');
}

// `lookupToken(token) => { expiresAt, consumedAt, ...scopeData } | null` is
// injected so this file has no direct database dependency.
function verifyScopedToken(lookupToken) {
  return async (req, res, next) => {
    const token = req.params.token;
    const row = await lookupToken(token);
    if (!row) return res.status(404).json({ error: 'Invalid link.' });
    if (row.consumedAt) return res.status(410).json({ error: 'This link has already been used.' });
    if (new Date(row.expiresAt) < new Date()) return res.status(410).json({ error: 'This link has expired.' });
    req.scopedLink = row;
    next();
  };
}

module.exports = { generateScopedToken, verifyScopedToken };
