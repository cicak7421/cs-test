// api/admin/detail.js
// GET ?candidate_id=... (Authorization: Bearer <ADMIN_API_TOKEN>)
// -> detail lengkap kandidat: jawaban MC+essay, dan transkrip simulasi komplain

const { getSupabaseAdmin } = require("../_lib/supabaseClient");
const { requireAdmin } = require("../_lib/adminAuth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { candidate_id } = req.query || {};
    if (!candidate_id) {
      return res.status(400).json({ error: "candidate_id wajib diisi." });
    }

    const supabase = getSupabaseAdmin();

    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidate_id)
      .single();
    if (candErr || !candidate) {
      return res.status(404).json({ error: "Kandidat tidak ditemukan." });
    }

    const { data: answers, error: ansErr } = await supabase
      .from("test_answers")
      .select("question_id, question_type, question_text, answer, correct_answer, is_correct, created_at")
      .eq("candidate_id", candidate_id)
      .order("created_at", { ascending: true });
    if (ansErr) throw ansErr;

    const { data: simulations, error: simErr } = await supabase
      .from("complaint_simulations")
      .select("id, platform, scenario_topic, persona, created_at")
      .eq("candidate_id", candidate_id)
      .order("created_at", { ascending: true });
    if (simErr) throw simErr;

    let transcripts = [];
    if (simulations.length > 0) {
      const simIds = simulations.map((s) => s.id);
      const { data: messages, error: msgErr } = await supabase
        .from("complaint_messages")
        .select("simulation_id, role, message, created_at")
        .in("simulation_id", simIds)
        .order("created_at", { ascending: true });
      if (msgErr) throw msgErr;

      transcripts = simulations.map((sim) => ({
        ...sim,
        messages: messages.filter((m) => m.simulation_id === sim.id),
      }));
    }

    return res.status(200).json({ candidate, answers, transcripts });
  } catch (err) {
    console.error("admin/detail error:", err);
    return res.status(500).json({ error: "Gagal mengambil detail kandidat." });
  }
};
