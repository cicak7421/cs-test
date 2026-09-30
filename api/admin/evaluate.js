// api/admin/evaluate.js
// POST { candidate_id } (Authorization: Bearer <ADMIN_API_TOKEN>)
// -> AI (Groq) menilai esai + transkrip simulasi komplain memakai rubrik CS,
//    menyimpan skor 0-100, ringkasan, kekuatan, dan catatan perhatian.
//    Skor akhir = objektif 30% + esai 30% + simulasi komplain 40%.

const { getSupabaseAdmin } = require("../_lib/supabaseClient");
const { requireAdmin } = require("../_lib/adminAuth");
const { callGroqWithRouter } = require("../_lib/groqRouter");
const { objectivePercent, computeTotal } = require("../_lib/scoring");

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI tidak mengembalikan JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

const RUBRIC = `Rubrik penilaian calon Customer Service marketplace (Shopee/TikTok Shop), tiap aspek 0-100:
1. Empati & sapaan: menyapa, meminta maaf secara tulus, mengakui masalah pelanggan.
2. Penggalian informasi: meminta nomor pesanan/bukti dengan tepat, tidak asal berasumsi.
3. Solusi & kepatuhan kebijakan: solusi konkret, realistis, tidak berbohong/berjanji berlebihan, tahu kapan eskalasi.
4. Bahasa & profesionalisme: sopan, jelas, rapi, tidak menyalahkan pelanggan, tidak membocorkan data pribadi.
5. Ketenangan & ketegasan: tetap tenang menghadapi pelanggan emosi, tegas tapi ramah.
Nilai ketat dan jujur: jawaban singkat/asal/kosong/menyalin jawaban generik harus mendapat skor rendah (di bawah 40). Skor 80+ hanya untuk jawaban yang benar-benar kuat.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    const { candidate_id } = req.body || {};
    if (!candidate_id) return res.status(400).json({ error: "candidate_id wajib diisi." });

    const supabase = getSupabaseAdmin();

    const { data: candidate, error: cErr } = await supabase
      .from("candidates").select("*").eq("id", candidate_id).single();
    if (cErr || !candidate) return res.status(404).json({ error: "Kandidat tidak ditemukan." });

    const { data: answers } = await supabase
      .from("test_answers").select("question_type, question_text, answer")
      .eq("candidate_id", candidate_id).eq("question_type", "essay");

    const { data: sims } = await supabase
      .from("complaint_simulations").select("id, platform, scenario_topic, persona")
      .eq("candidate_id", candidate_id);

    let transcript = "";
    let agentMsgCount = 0;
    if (sims && sims.length) {
      const { data: msgs } = await supabase
        .from("complaint_messages").select("simulation_id, role, message, created_at")
        .in("simulation_id", sims.map((s) => s.id)).order("created_at", { ascending: true });
      transcript = (msgs || [])
        .map((m) => {
          if (m.role === "agent") agentMsgCount += 1;
          return `${m.role === "agent" ? "CS (kandidat)" : "Pelanggan"}: ${m.message}`;
        })
        .join("\n");
    }

    const essayText = (answers || [])
      .map((a, i) => `Esai ${i + 1}. Soal: ${a.question_text}\nJawaban: ${(a.answer || "").trim() || "(kosong)"}`)
      .join("\n\n");

    const prompt = `${RUBRIC}

Kamu adalah asesor HR senior. Nilai kandidat CS berikut. Balas HANYA dengan satu objek JSON valid (tanpa markdown, tanpa teks lain) dengan bentuk persis:
{"essay_score":0-100,"complaint_score":0-100,"summary":"2-3 kalimat penilaian keseluruhan dalam Bahasa Indonesia","strengths":["maks 3 poin singkat"],"concerns":["maks 3 poin singkat, kosongkan jika tidak ada"],"essay_notes":"1-2 kalimat","complaint_notes":"1-2 kalimat"}

=== JAWABAN ESAI ===
${essayText || "(tidak ada jawaban esai)"}

=== TRANSKRIP SIMULASI KOMPLAIN (skenario: ${sims?.[0]?.scenario_topic || "-"}) ===
${transcript || "(kandidat tidak melakukan simulasi)"}`;

    const { text, usedModel } = await callGroqWithRouter(
      [
        { role: "system", content: "Kamu menilai kandidat customer service secara objektif dan hanya menjawab dengan JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, max_tokens: 900 }
    );

    const ai = extractJson(text);
    const essayScore = clamp(ai.essay_score);
    // Tanpa balasan sama sekali -> simulasi otomatis 0
    const complaintScore = agentMsgCount === 0 ? 0 : clamp(ai.complaint_score);
    // Kalau data tes pengetahuan tidak tersimpan/tidak dikerjakan, pilihan ganda dihitung 0
    // supaya skor akhir tetap keluar (sebelumnya jadi kosong dan tampil "Belum dinilai").
    const objectiveRaw = objectivePercent(candidate.knowledge_score, candidate.knowledge_total);
    const objectiveMissing = objectiveRaw === null;
    const objective = objectiveMissing ? 0 : objectiveRaw;
    const total = computeTotal({ objective, essay: essayScore, complaint: complaintScore });

    const evaluation = {
      summary: String(ai.summary || "").slice(0, 600),
      strengths: (ai.strengths || []).slice(0, 3).map(String),
      concerns: (ai.concerns || []).slice(0, 3).map(String),
      essay_notes: String(ai.essay_notes || "").slice(0, 400),
      complaint_notes: String(ai.complaint_notes || "").slice(0, 400),
      objective_missing: objectiveMissing,
      model: usedModel,
    };

    const { error: uErr } = await supabase
      .from("candidates")
      .update({
        essay_score: essayScore,
        complaint_score: complaintScore,
        total_score: total,
        ai_evaluation: evaluation,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", candidate_id);
    if (uErr) throw uErr;

    return res.status(200).json({
      essay_score: essayScore,
      complaint_score: complaintScore,
      total_score: total,
      ai_evaluation: evaluation,
    });
  } catch (err) {
    console.error("admin/evaluate error:", err);
    return res.status(500).json({ error: "Penilaian AI gagal. Coba lagi sebentar." });
  }
};
