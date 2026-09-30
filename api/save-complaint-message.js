// api/save-complaint-message.js
// POST { simulation_id, message }
// -> simpan balasan CS (role: agent), lalu minta Groq balas lagi sebagai AI customer
//    (dibatasi maksimal N putaran). Tidak ada penilaian/skor — cuma disimpan buat HR.

const { getSupabaseAdmin } = require("./_lib/supabaseClient");
const { callGroqWithRouter } = require("./_lib/groqRouter");

const MAX_EXCHANGES = parseInt(process.env.MAX_COMPLAINT_EXCHANGES || "5", 10);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { simulation_id, message } = req.body || {};
    if (!simulation_id || !message || !String(message).trim()) {
      return res.status(400).json({ error: "Pesan balasan tidak boleh kosong." });
    }

    const supabase = getSupabaseAdmin();

    const { data: sim, error: simErr } = await supabase
      .from("complaint_simulations")
      .select("id, platform, scenario_topic, persona")
      .eq("id", simulation_id)
      .single();

    if (simErr || !sim) {
      return res.status(404).json({ error: "Sesi simulasi tidak ditemukan." });
    }

    const { data: history, error: histErr } = await supabase
      .from("complaint_messages")
      .select("role, message, created_at")
      .eq("simulation_id", simulation_id)
      .order("created_at", { ascending: true });

    if (histErr) throw histErr;

    // Simpan balasan CS (agent) dulu
    const { error: agentInsertErr } = await supabase.from("complaint_messages").insert({
      simulation_id,
      role: "agent",
      message: String(message).trim(),
    });
    if (agentInsertErr) throw agentInsertErr;

    const agentTurns = history.filter((h) => h.role === "agent").length + 1;

    // Kalau sudah mencapai batas putaran, tidak perlu balasan AI lagi -> percakapan selesai
    if (agentTurns >= MAX_EXCHANGES) {
      return res.status(200).json({
        ai_reply: null,
        conversation_ended: true,
      });
    }

    // Susun ulang percakapan buat konteks Groq
    const systemPrompt = `Kamu berperan sebagai PELANGGAN (bukan CS) di platform ${
      sim.platform === "shopee" ? "Shopee" : "TikTok Shop"
    } yang sedang komplain ke customer service toko.
Konteks masalah: ${sim.scenario_topic}.
Gaya/emosi kamu: ${sim.persona}, tapi responsmu boleh sedikit mereda kalau CS menjawab dengan baik, atau makin kesal kalau CS menjawab buruk/tidak membantu.
Balas SATU pesan singkat (1-4 kalimat) melanjutkan percakapan, dalam Bahasa Indonesia sehari-hari, seperti chat asli. JANGAN berperan sebagai CS. JANGAN gunakan markdown.`;

    const conversation = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      conversation.push({
        role: h.role === "ai_customer" ? "assistant" : "user",
        content: h.message,
      });
    }
    conversation.push({ role: "user", content: String(message).trim() });

    const { text, usedKeyIndex } = await callGroqWithRouter(conversation, {
      temperature: 0.85,
      max_tokens: 200,
    });

    const { error: aiInsertErr } = await supabase.from("complaint_messages").insert({
      simulation_id,
      role: "ai_customer",
      message: text,
    });
    if (aiInsertErr) throw aiInsertErr;

    return res.status(200).json({
      ai_reply: text,
      conversation_ended: agentTurns + 1 >= MAX_EXCHANGES,
      _debug_groq_key_used: usedKeyIndex,
    });
  } catch (err) {
    console.error("save-complaint-message error:", err);
    return res.status(500).json({ error: "Gagal memproses balasan simulasi." });
  }
};
