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

    const { data, error } = await supabase
      .from("candidates")
      .select(
        "id, name, email, phone, applied_position, platform_focus, status, knowledge_score, knowledge_total, auto_submitted_knowledge, auto_submitted_complaint, started_at, knowledge_submitted_at, completed_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ candidates: data });
  } catch (err) {
    console.error("admin/results error:", err);
    return res.status(500).json({ error: "Gagal mengambil data kandidat." });
  }
};
