// api/finish-test.js
// POST { candidate_id, auto_submitted }
// -> menandai seluruh sesi test (knowledge + complaint simulation) selesai

const { getSupabaseAdmin } = require("./_lib/supabaseClient");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { candidate_id, auto_submitted } = req.body || {};
    if (!candidate_id) {
      return res.status(400).json({ error: "candidate_id wajib diisi." });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("candidates")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        auto_submitted_complaint: !!auto_submitted,
      })
      .eq("id", candidate_id);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("finish-test error:", err);
    return res.status(500).json({ error: "Gagal menyelesaikan sesi test." });
  }
};
