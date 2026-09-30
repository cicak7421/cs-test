// api/_lib/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di environment variables."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

module.exports = { getSupabaseAdmin };
