// api/start-test.js
// POST { name, email, phone, applied_position, platform_focus }
// -> membuat baris kandidat baru & mengembalikan candidate_id + waktu mulai + batas waktu

const { getSupabaseAdmin } = require("./_lib/supabaseClient");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, phone } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "Nama dan email wajib diisi." });
    }

    // Posisi & fokus platform dihapus dari form — test ini selalu untuk CS
    // Shopee & TikTok Shop, jadi skenario simulasi tetap random dari keduanya.
    const platform = "both";

    const knowledgeLimit = parseInt(process.env.KNOWLEDGE_TIME_LIMIT_MINUTES || "15", 10);
    const complaintLimit = parseInt(process.env.COMPLAINT_TIME_LIMIT_MINUTES || "10", 10);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name: String(name).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : null,
        platform_focus: platform,
        status: "in_progress",
        knowledge_time_limit_minutes: knowledgeLimit,
        complaint_time_limit_minutes: complaintLimit,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      candidate_id: data.id,
      started_at: data.started_at,
      knowledge_time_limit_minutes: data.knowledge_time_limit_minutes,
      complaint_time_limit_minutes: data.complaint_time_limit_minutes,
    });
  } catch (err) {
    console.error("start-test error:", err);
    return res.status(500).json({ error: "Gagal memulai test. Coba lagi." });
  }
};
