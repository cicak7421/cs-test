// api/finish-test.js
// POST { candidate_id, auto_submitted }
// -> menandai seluruh sesi test (knowledge + complaint simulation) selesai

const { getSupabaseAdmin } = require("./_lib/supabaseClient");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { candidate_id, auto_submitted, violation } = req.body || {};
    if (!candidate_id) {
      return res.status(400).json({ error: "candidate_id wajib diisi." });
    }

    const supabase = getSupabaseAdmin();

    const update = {
      status: "completed",
      completed_at: new Date().toISOString(),
      auto_submitted_complaint: !!auto_submitted,
    };

    // Kandidat keluar halaman saat simulasi: catat 1x pindah tab
    if (violation) {
      const { data: cur } = await supabase
        .from("candidates")
        .select("tab_switches")
        .eq("id", candidate_id)
        .single();
      update.tab_switches = Math.min(((cur && cur.tab_switches) || 0) + 1, 999);
    }

    const { error } = await supabase
      .from("candidates")
      .update(update)
      .eq("id", candidate_id);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("finish-test error:", err);
    return res.status(500).json({ error: "Gagal menyelesaikan sesi test." });
  }
};
