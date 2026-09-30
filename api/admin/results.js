// api/admin/results.js
// GET (Authorization: Bearer <ADMIN_API_TOKEN>) -> daftar semua kandidat + ringkasan hasil

const { getSupabaseAdmin } = require("../_lib/supabaseClient");
const { requireAdmin } = require("../_lib/adminAuth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const supabase = getSupabaseAdmin();

    // select("*") supaya tidak gagal kalau ada kolom yang belum dibuat di database;
    // field yang belum ada otomatis kosong di panel admin.
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ candidates: data });
  } catch (err) {
    console.error("admin/results error:", err);

    // Petunjuk penyebab (aman: tanpa membocorkan key/isi DB)
    const msg = String((err && err.message) || "");
    const code = String((err && err.code) || "");
    let hint = "";
    if (/SUPABASE_URL|SERVICE_ROLE_KEY.*belum/i.test(msg)) {
      hint = "Env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum terpasang di Vercel.";
    } else if (/fetch failed|ENOTFOUND|invalid url/i.test(msg)) {
      hint = "SUPABASE_URL salah atau tidak bisa dijangkau.";
    } else if (/invalid api key|jwt/i.test(msg) || code === "PGRST301") {
      hint = "SUPABASE_SERVICE_ROLE_KEY salah. Pakai service_role key, bukan anon key.";
    } else if (code === "42P01" || code === "PGRST205" || /could not find the table|does not exist/i.test(msg)) {
      hint = "Tabel belum dibuat. Jalankan supabase-schema.sql di Supabase SQL Editor.";
    } else if (code === "PGRST204" || code === "42703") {
      hint = "Kolom tabel candidates belum lengkap. Jalankan ulang supabase-schema.sql.";
    }
    return res.status(500).json({
      error: "Gagal mengambil data kandidat." + (hint ? ` (${hint})` : ""),
    });
  }
};
