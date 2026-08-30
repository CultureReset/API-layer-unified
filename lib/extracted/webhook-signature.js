// EXTRACTED FROM: gcr-api-clean/routes/meta-webhook.js — HMAC-SHA256
// signature verification over the raw request body, contrasted with
// cybercheck-api-database's webhook handling (routes/stripe.js,
// routes/webhooks.js), where signature checking is OPTIONAL and silently
// disables itself if the secret env var isn't set — confirmed exploitable:
// anyone can POST a forged "payment succeeded" event and mark a booking
// paid. Twilio/Sendblue webhooks in that same repo have no verification at
// all.
//
// WHAT IT DOES: verifies a webhook's HMAC signature using a constant-time
// comparison, and — the actual point of extracting this as its own
// function rather than inlining it — REFUSES to run if no secret is
// configured, instead of treating "not configured" as "skip the check."
// Fail closed, never fail open.
//
// STATUS: standalone. This repo has no webhook receivers yet; wire this in
// as soon as one exists (a future Stripe/Composio webhook), and route
// registration MUST use express.raw() for that path — signature
// verification runs over the exact bytes sent, not a re-serialized
// req.body.

const crypto = require('crypto');

function verifyWebhookSignature({ secret, signatureHeader, rawBody, algorithm = 'sha256' }) {
  if (!secret) {
    throw new Error('Webhook secret is not configured — refusing to accept unverified webhook input.');
  }
  if (!signatureHeader) return false;

  const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedHex = signatureHeader.replace(/^sha256=/, '');
  let providedBuf;
  try {
    providedBuf = Buffer.from(providedHex, 'hex');
  } catch {
    return false;
  }
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

module.exports = { verifyWebhookSignature };
