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

    if (!name || !email || !phone) {
      return res.status(400).json({ error: "Nama, email, dan nomor WhatsApp wajib diisi." });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      return res.status(400).json({ error: "Format email tidak valid." });
    }

    // Cegah pendaftar ganda dengan email yang sama
    {
      const sb = getSupabaseAdmin();
      const { data: dup } = await sb
        .from("candidates")
        .select("id")
        .ilike("email", String(email).trim())
        .limit(1);
      if (dup && dup.length > 0) {
        return res.status(409).json({ error: "Email ini sudah pernah dipakai mengikuti tes." });
      }
    }

    // Posisi & fokus platform dihapus dari form — test ini selalu untuk CS
    // Shopee & TikTok Shop, jadi skenario simulasi tetap random dari keduanya.
    const platform = "both";

    // Satu timer 15 menit untuk seluruh soal (pengetahuan + simulasi komplain).
    const totalLimit = parseInt(process.env.TOTAL_TIME_LIMIT_MINUTES || "15", 10);
    const knowledgeLimit = totalLimit;
    const complaintLimit = totalLimit;

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

    // Petunjuk penyebab (aman: tanpa membocorkan key/isi DB) supaya gampang di-debug
    const msg = String((err && err.message) || "");
    const code = String((err && err.code) || "");
    let hint = "";
    if (/SUPABASE_URL|SERVICE_ROLE_KEY.*belum/i.test(msg)) {
      hint = "Env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum terpasang di Vercel.";
    } else if (/fetch failed|ENOTFOUND|invalid url/i.test(msg)) {
      hint = "SUPABASE_URL salah/tidak bisa dijangkau. Cek lagi URL project Supabase.";
    } else if (/invalid api key|jwt/i.test(msg) || code === "PGRST301") {
      hint = "SUPABASE_SERVICE_ROLE_KEY salah. Pakai service_role key, bukan anon key.";
    } else if (code === "42P01" || code === "PGRST205" || /could not find the table|does not exist/i.test(msg)) {
      hint = "Tabel belum dibuat. Jalankan supabase-schema.sql di Supabase SQL Editor.";
    } else if (code === "PGRST204" || code === "42703") {
      hint = "Struktur tabel candidates tidak cocok dengan schema terbaru. Jalankan ulang supabase-schema.sql.";
    }

    return res.status(500).json({
      error: "Gagal memulai test. Coba lagi." + (hint ? ` (${hint})` : ""),
    });
  }
};
