// The one Supabase client. No in-memory fallback, no hardcoded data — if
// these env vars are missing, the app fails to start, on purpose. This
// mirrors the real pattern already proven in gcr-api-clean/db.js: one
// service-role client, read from the environment, and nothing above this
// file is allowed to hold its own database credentials.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Copy .env.example to .env ' +
    'and fill in your own Supabase project — this repo does not share a ' +
    'database with any other CultureReset repo.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
