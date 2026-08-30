// EXTRACTED FROM: cybercheck-orchestrator/src/kernel/policy.js (74 lines) —
// resolveDisposition(): a membership-specific grant beats a role-level
// grant, an explicit 'never' anywhere wins over any 'auto'/'ask', absence
// of any grant is a denial (never default-allow), and a separate `system`
// path lets platform-internal automation act without a person's own grants
// blocking it — while an explicit 'never' still stops it.
//
// WHAT IT DOES: per-seat permission overrides on top of role defaults — the
// common real requirement of "this one staff member needs one extra
// permission without becoming an owner."
//
// STATUS: standalone, NOT NEEDED YET. This platform's tenant_members table
// only has two roles (owner/staff) with no capability-level grants — every
// staff member currently has identical permissions. Adopt this the day a
// tenant asks for "can my staff see X but not do Y" — don't build the
// grants table and this resolver speculatively before that request exists.

function resolveDisposition({ grants, membershipId, role, capability, resource = '*', system = false }) {
  if (system) {
    const denied = grants.some(
      (g) => g.capability === capability && g.disposition === 'never'
    );
    return denied ? 'never' : 'auto';
  }

  const applicable = grants.filter(
    (g) =>
      g.capability === capability &&
      (g.resource === '*' || g.resource === resource) &&
      (g.membership_id === membershipId || g.role === role)
  );

  if (applicable.length === 0) return 'never';
  if (applicable.some((g) => g.disposition === 'never')) return 'never';

  const specific = applicable.find((g) => g.membership_id === membershipId);
  if (specific) return specific.disposition;

  return applicable.some((g) => g.disposition === 'auto') ? 'auto' : 'ask';
}

module.exports = { resolveDisposition };
