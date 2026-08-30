// EXTRACTED FROM: cybercheck-orchestrator/src/kernel/providers.js (135
// lines) — a "slot" abstraction: the platform declares an interface a
// provider package must satisfy, checked at LOAD TIME (not discovered
// missing in production), and a tenant-specific binding shadows the
// platform default.
//
// WHAT IT DOES: lets different tenants use different swappable
// integrations for the same job (tenant A uses Stripe, tenant B uses a
// different processor; tenant A uses SendGrid, tenant B uses Postmark)
// with a sane platform default and a contract check that fails at
// registration, not at 2am when a tenant's request hits the missing method.
//
// STATUS: standalone, NOT NEEDED YET. Every current feature (Booking, the
// two dashboards) hits Supabase directly — there is exactly one provider
// per job, no tenant has asked for a swappable backend. Adopt this the day
// a real "tenant A wants Stripe, tenant B wants Square" requirement shows
// up — building it before that request exists is solving a problem nobody
// has yet.

const slots = new Map(); // slotName -> { requiredExports, default: providerId, providers: Map }

function defineSlot(slotName, { requiredExports }) {
  slots.set(slotName, { requiredExports, default: null, providers: new Map() });
}

function registerProvider(slotName, providerId, module, { asDefault = false } = {}) {
  const slot = slots.get(slotName);
  if (!slot) throw new Error(`No such slot: ${slotName}`);
  for (const exportName of slot.requiredExports) {
    if (typeof module[exportName] !== 'function') {
      throw new Error(`Provider "${providerId}" for slot "${slotName}" is missing required export "${exportName}"`);
    }
  }
  slot.providers.set(providerId, module);
  if (asDefault || !slot.default) slot.default = providerId;
}

// tenantBinding is optional — omit it to get the platform default.
function resolveProvider(slotName, tenantBinding) {
  const slot = slots.get(slotName);
  if (!slot) throw new Error(`No such slot: ${slotName}`);
  const providerId = tenantBinding || slot.default;
  const provider = slot.providers.get(providerId);
  if (!provider) throw new Error(`No provider "${providerId}" registered for slot "${slotName}"`);
  return provider;
}

module.exports = { defineSlot, registerProvider, resolveProvider };
