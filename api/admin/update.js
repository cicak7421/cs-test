// api/admin/update.js
// POST { candidate_id, decision?, hr_notes? } -> ubah keputusan seleksi & catatan HR

const { getSupabaseAdmin } = require("../_lib/supabaseClient");
const { requireAdmin } = require("../_lib/adminAuth");

const DECISIONS = ["new", "shortlist", "interview", "hired", "rejected"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    const { candidate_id, decision, hr_notes } = req.body || {};
    if (!candidate_id) return res.status(400).json({ error: "candidate_id wajib diisi." });

    const patch = {};
    if (decision !== undefined) {
      if (!DECISIONS.includes(decision)) return res.status(400).json({ error: "Keputusan tidak valid." });
      patch.decision = decision;
    }
    if (hr_notes !== undefined) patch.hr_notes = String(hr_notes).slice(0, 2000);
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Tidak ada perubahan." });

    const { error } = await getSupabaseAdmin().from("candidates").update(patch).eq("id", candidate_id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("admin/update error:", err);
    return res.status(500).json({ error: "Gagal menyimpan perubahan." });
  }
};
