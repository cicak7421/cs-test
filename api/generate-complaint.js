// api/generate-complaint.js
// POST { candidate_id }
// -> membuat sesi complaint_simulations baru, minta Groq generate keluhan pembuka
//    dari persona customer Shopee/TikTok Shop yang komplain, simpan sebagai pesan pertama.

const { getSupabaseAdmin } = require("./_lib/supabaseClient");
const { callGroqWithRouter } = require("./_lib/groqRouter");

const TOPICS = [
  { platform: "shopee", topic: "barang diterima dalam kondisi rusak/pecah" },
  { platform: "shopee", topic: "resi tidak update selama beberapa hari padahal status 'dikirim'" },
  { platform: "shopee", topic: "produk yang diterima tidak sesuai deskripsi/warna/ukuran" },
  { platform: "shopee", topic: "pengajuan refund ditolak tapi pembeli merasa berhak dapat refund" },
  { platform: "tiktok", topic: "paket belum sampai padahal estimasi pengiriman sudah lewat jauh" },
  { platform: "tiktok", topic: "barang yang datang adalah produk yang salah/berbeda dari pesanan" },
  { platform: "tiktok", topic: "kupon/voucher yang dipakai saat checkout tidak terpakai sesuai promosi" },
  { platform: "tiktok", topic: "penjual lambat merespons chat selama proses sebelum pesanan dikirim" },
];

const PERSONAS = [
  "pelanggan yang sudah menunggu lama dan mulai tidak sabar",
  "pelanggan yang marah dan menulis dengan huruf kapital",
  "pelanggan yang kecewa tapi masih cukup sopan",
  "pelanggan yang mengancam akan memberi rating bintang 1 dan komplain ke media sosial",
  "pelanggan yang bingung dan butuh penjelasan detail langkah demi langkah",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { candidate_id } = req.body || {};
    if (!candidate_id) {
      return res.status(400).json({ error: "candidate_id wajib diisi." });
    }

    const supabase = getSupabaseAdmin();

    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .select("id, platform_focus")
      .eq("id", candidate_id)
      .single();

    if (candErr || !candidate) {
      return res.status(404).json({ error: "Kandidat tidak ditemukan." });
    }

    // Pilih topik sesuai fokus platform kandidat (kalau 'both', bebas random)
    let candidateTopics = TOPICS;
    if (candidate.platform_focus === "shopee" || candidate.platform_focus === "tiktok") {
      candidateTopics = TOPICS.filter((t) => t.platform === candidate.platform_focus);
    }
    const chosen = pickRandom(candidateTopics);
    const persona = pickRandom(PERSONAS);

    const systemPrompt = `Kamu berperan sebagai PELANGGAN (bukan CS) di platform ${chosen.platform === "shopee" ? "Shopee" : "TikTok Shop"} yang sedang komplain ke customer service toko.
Konteks masalah: ${chosen.topic}.
Gaya/emosi kamu saat ini: ${persona}.
Tulis SATU pesan pembuka (2-5 kalimat) dalam Bahasa Indonesia sehari-hari, realistis seperti chat asli pelanggan ke CS.
JANGAN menyelesaikan masalahmu sendiri, JANGAN berperan sebagai CS, dan JANGAN gunakan format markdown atau tanda kutip. Langsung tulis isi pesannya saja.`;

    const { text, usedKeyIndex } = await callGroqWithRouter(
      [{ role: "system", content: systemPrompt }, { role: "user", content: "Mulai keluhanmu sekarang." }],
      { temperature: 0.9, max_tokens: 220 }
    );

    const { data: sim, error: simErr } = await supabase
      .from("complaint_simulations")
      .insert({
        candidate_id,
        platform: chosen.platform,
        scenario_topic: chosen.topic,
        persona,
      })
      .select()
      .single();

    if (simErr) throw simErr;

    const { error: msgErr } = await supabase.from("complaint_messages").insert({
      simulation_id: sim.id,
      role: "ai_customer",
      message: text,
    });
    if (msgErr) throw msgErr;

    return res.status(200).json({
      simulation_id: sim.id,
      platform: chosen.platform,
      opening_message: text,
      _debug_groq_key_used: usedKeyIndex, // aman ditampilkan, cuma index (1-6) bukan value key
    });
  } catch (err) {
    console.error("generate-complaint error:", err);
    return res.status(500).json({
      error:
        "Gagal membuat simulasi komplain (AI router gagal di semua API key). Coba lagi sebentar.",
    });
  }
};
