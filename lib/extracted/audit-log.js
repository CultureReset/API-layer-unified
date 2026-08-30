// EXTRACTED FROM: gcr-api-clean/lib/edit-log.js — audit-log writes that
// catch-and-warn so a logging failure never fails the write it's
// describing.
//
// WHAT IT DOES: records who did what, without ever being the reason a real
// action fails. If the audit write itself throws (DB hiccup, whatever),
// that's logged to the console and swallowed — the caller's actual
// operation already succeeded and must not be rolled back because its
// audit trail couldn't be written.
//
// STATUS: standalone, not wired into any route yet — no admin action in
// this platform currently writes an audit trail. Cheap to add to any
// admin-directory or admin-catalog write (routes/admin-directory.js,
// routes/admin-apps-catalog.js, routes/admin-connectors-catalog.js) the
// next time one of those is touched.

async function recordAuditEntry({ insertRow, actorId, action, detail = {} }) {
  try {
    await insertRow({ actor_id: actorId, action, detail, at: new Date().toISOString() });
  } catch (e) {
    console.warn(`Audit log write failed (action "${action}" still succeeded):`, e.message);
  }
}

module.exports = { recordAuditEntry };
