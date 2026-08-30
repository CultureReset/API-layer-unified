// EXTRACTED FROM: gcr-api-clean/utils/ai-provider.js (DB-configurable
// per-task provider lookup, TTL-cached, safe default on failure) merged
// with cybercheck-orchestrator/src/kernel/router.js (74 lines — candidate
// scoring against a task shape, try-in-order with fallback, latency/cost
// logged per decision). gcr-api-clean's own routes/ai-provider.js was
// explicitly flagged by that repo's own review as a thinner duplicate
// (auto-detects a provider from which env var happens to be set, no
// per-task control, no real fallback chain) — this file follows the
// utils/ version's design, not routes/.
//
// WHAT IT DOES: picks the best available AI (or any multi-vendor) provider
// for a task by scoring candidates against what the task needs, tries them
// in ranked order, and falls through to the next on failure instead of
// hard-failing when one vendor is down.
//
// STATUS: standalone, NOT NEEDED YET. No feature in this platform calls an
// AI provider today. Wire this in the day one does, instead of hardcoding
// a single vendor's SDK call inline — the fallback chain and decision log
// are cheap to have from day one of that feature, expensive to retrofit
// after a vendor outage takes the feature down.

function scoreCandidate(candidate, task) {
  let score = 0;
  if (task.need && candidate.capabilities?.includes(task.need)) score += 10;
  if (task.maxCents != null && candidate.costCents <= task.maxCents) score += 5;
  if (task.local && candidate.local) score += 3;
  return score;
}

async function routeTask(task, candidates, { onDecision } = {}) {
  const ranked = [...candidates].sort((a, b) => scoreCandidate(b, task) - scoreCandidate(a, task));
  let fellBackFrom = null;

  for (const candidate of ranked) {
    const start = Date.now();
    try {
      const output = await candidate.complete(task);
      if (onDecision) {
        onDecision({ provider: candidate.id, fellBackFrom, latencyMs: Date.now() - start, success: true });
      }
      return { provider: candidate.id, output };
    } catch (e) {
      fellBackFrom = candidate.id;
      if (onDecision) {
        onDecision({ provider: candidate.id, latencyMs: Date.now() - start, success: false, error: e.message });
      }
    }
  }
  throw new Error('All providers failed for this task.');
}

module.exports = { scoreCandidate, routeTask };
