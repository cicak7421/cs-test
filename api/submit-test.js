// api/submit-test.js
// POST { candidate_id, answers: [{question_id, question_type, question_text, answer}], auto_submitted }
// -> menyimpan semua jawaban, menghitung skor MC otomatis, update status kandidat

const { getSupabaseAdmin } = require("./_lib/supabaseClient");
const { getQuestionMeta } = require("./_lib/questionBank");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { candidate_id, answers, auto_submitted } = req.body || {};

    if (!candidate_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Data tidak lengkap." });
    }

    const supabase = getSupabaseAdmin();

    // Pastikan kandidat ada & belum submit knowledge test dua kali
    const { data: candidate, error: findErr } = await supabase
      .from("candidates")
      .select("id, status")
      .eq("id", candidate_id)
      .single();

    if (findErr || !candidate) {
      return res.status(404).json({ error: "Kandidat tidak ditemukan." });
    }

    if (candidate.status !== "in_progress") {
      return res.status(409).json({ error: "Test pengetahuan sudah pernah disubmit." });
    }

    let correctCount = 0;
    let scorableTotal = 0; // pilihan ganda + tes fokus (soal yang punya kunci jawaban objektif)

    const rows = answers.map((a) => {
      const meta = getQuestionMeta(a.question_id);
      let isCorrect = null;
      let correctAnswer = null;

      if (meta && meta.type === "multiple_choice") {
        scorableTotal += 1;
        const submittedIndex =
          a.answer === "" || a.answer === undefined || a.answer === null
            ? null
            : parseInt(a.answer, 10);
        isCorrect = submittedIndex === meta.correctIndex;
        correctAnswer = String(meta.correctIndex);
        if (isCorrect) correctCount += 1;
      } else if (meta && meta.type === "focus_match") {
        scorableTotal += 1;
        const submittedValue = a.answer === undefined || a.answer === null ? "" : String(a.answer);
        isCorrect = submittedValue === meta.correctAnswer;
        correctAnswer = meta.correctAnswer;
        if (isCorrect) correctCount += 1;
      }

      return {
        candidate_id,
        question_id: a.question_id,
        question_type: a.question_type,
        question_text: a.question_text || null,
        answer: a.answer !== undefined && a.answer !== null ? String(a.answer) : null,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
      };
    });

    const { error: insertErr } = await supabase.from("test_answers").insert(rows);
    if (insertErr) throw insertErr;

    const { error: updateErr } = await supabase
      .from("candidates")
      .update({
        status: "knowledge_done",
        knowledge_submitted_at: new Date().toISOString(),
        knowledge_score: correctCount,
        knowledge_total: scorableTotal,
        auto_submitted_knowledge: !!auto_submitted,
      })
      .eq("id", candidate_id);

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      knowledge_score: correctCount,
      knowledge_total: scorableTotal,
    });
  } catch (err) {
    console.error("submit-test error:", err);
    return res.status(500).json({ error: "Gagal menyimpan jawaban test." });
  }
};
