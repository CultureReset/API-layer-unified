// EXTRACTED FROM: gcr-api-clean/lib/touristMemory.js — a category/key/value
// AI-agent memory store: remember() upserts on (user_id, category, key),
// recall() reads it back, briefing() renders it as a paragraph injected
// into a system prompt BEFORE the model asks — so a returning user isn't
// re-interrogated for facts already known.
//
// WHAT IT DOES: durable, structured memory for an AI assistant feature,
// already decoupled from GCR specifics — only the table name is
// domain-specific in the source.
//
// STATUS: standalone, NOT NEEDED YET. No AI-assistant feature exists in
// this platform. Wire this in the day one does — `upsertMemory`/
// `getMemories`/`buildBriefing` are injected as DB functions so adopting
// this is "point it at a real table," not new design work.

async function remember({ upsertMemory, ownerId, category, key, value }) {
  await upsertMemory({ owner_id: ownerId, category, key, value, updated_at: new Date().toISOString() });
}

async function recall({ getMemories, ownerId, category }) {
  return getMemories({ owner_id: ownerId, category });
}

// Renders known facts as a short paragraph — meant to be prepended to an AI
// agent's system prompt so it already knows what it's been told before.
function buildBriefing(memories) {
  if (!memories.length) return '';
  const byCategory = new Map();
  for (const m of memories) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category).push(`${m.key}: ${m.value}`);
  }
  return [...byCategory.entries()]
    .map(([category, facts]) => `${category} — ${facts.join(', ')}`)
    .join('. ');
}

module.exports = { remember, recall, buildBriefing };
