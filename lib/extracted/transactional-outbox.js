// EXTRACTED FROM: cybercheck-orchestrator/src/kernel/events.js (28 lines) —
// a minimal transactional outbox: emit() writes an event row in the same
// write path as the change that caused it; drain() polls undelivered rows
// and hands each to in-process subscribers by topic, isolating one
// subscriber's failure from the rest.
//
// WHAT IT DOES: tenant-scoped, at-least-once event delivery without a
// message broker — good enough for "one app's action should trigger
// another app's reaction" inside one process.
//
// STATUS: standalone, not wired in, and NOT NEEDED YET. Apps and
// Connectors are deliberately independent systems in this platform right
// now (see the root README) — there is no feature today where one needs to
// react to the other. Building this in before a real cross-app trigger
// exists would be exactly the kind of speculative complexity this
// platform has otherwise avoided. Adopt it the day a real feature needs
// it (e.g. "a new booking should notify the SMS app"), not before.
//
// Gap carried over from the source: no retry/backoff or dead-letter
// handling on subscriber failure — it logs and marks delivered regardless.
// Worth adding at adoption time, not worth solving speculatively now.

const subscribers = new Map();

function on(topic, handler) {
  if (!subscribers.has(topic)) subscribers.set(topic, []);
  subscribers.get(topic).push(handler);
}

// `insertRow` and `markDelivered`/`fetchUndelivered` are injected so this
// file has no direct database dependency — wire it to Supabase (or
// whatever an event_outbox table looks like) at the call site.
async function emit({ tenantId, topic, payload, insertRow }) {
  await insertRow({ tenant_id: tenantId, topic, payload, delivered_at: null });
}

async function drain({ fetchUndelivered, markDelivered, limit = 100 }) {
  const rows = await fetchUndelivered(limit);
  for (const row of rows) {
    const handlers = subscribers.get(row.topic) || [];
    for (const handler of handlers) {
      try {
        await handler(row);
      } catch (e) {
        console.error(`Subscriber for topic "${row.topic}" failed:`, e.message);
      }
    }
    await markDelivered(row.id);
  }
}

module.exports = { on, emit, drain };
