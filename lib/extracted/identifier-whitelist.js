// EXTRACTED FROM: cybercheck-cloud/src/appdata.js:19-27 — the narrow gate
// every table/column/namespace name passes through before it can reach a
// dynamically-built SQL string. Its own comment states the reasoning
// directly: "The manifest schema already constrains these, but a validator
// that is bypassed once should not also be the only thing standing between
// a manifest and `drop table`."
//
// WHAT IT DOES: defense in depth — a single, narrow, impossible-to-miss
// check that a string is safe to interpolate into an identifier position
// in SQL (a table or column name), independent of and in addition to
// whatever higher-level validation already ran.
//
// STATUS: standalone, unused. This platform's routes never build SQL by
// string interpolation — every query goes through the Supabase JS query
// builder (parameterized), which doesn't have this problem to begin with.
// Kept here for the day a feature needs raw SQL (a schema-discovery
// endpoint, a dynamic report builder) — at that point, every identifier
// that isn't a string literal in the source code must pass through this
// first, not "the higher-level check already handles it."

const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

function safeIdentifier(value, what = 'identifier') {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Unsafe ${what}: ${JSON.stringify(value)}`);
  }
  return value;
}

module.exports = { safeIdentifier };
