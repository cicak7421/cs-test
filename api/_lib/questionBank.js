// api/_lib/questionBank.js
// VERSI SERVER — berisi kunci jawaban. JANGAN diletakkan di /public.
// Question id di sini harus SAMA persis dengan public/js/questions.js.

const QUESTION_BANK = [
  { id: "mc-01", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-02", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-03", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-04", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-05", type: "multiple_choice", correctIndex: 0 },
  { id: "mc-06", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-07", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-08", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-09", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-10", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-11", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-12", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-13", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-14", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-15", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-16", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-17", type: "multiple_choice", correctIndex: 1 },
  { id: "mc-18", type: "multiple_choice", correctIndex: 1 },

  // Tes fokus/ketelitian: correctAnswer "same" kalau pairA === pairB, "different" kalau tidak.
  // Harus tetap sinkron dengan pairA/pairB di public/js/questions.js.
  { id: "fc-01", type: "focus_match", correctAnswer: "same" },
  { id: "fc-02", type: "focus_match", correctAnswer: "different" },
  { id: "fc-03", type: "focus_match", correctAnswer: "same" },
  { id: "fc-04", type: "focus_match", correctAnswer: "different" },
  { id: "fc-05", type: "focus_match", correctAnswer: "same" },
  { id: "fc-06", type: "focus_match", correctAnswer: "different" },
  { id: "fc-07", type: "focus_match", correctAnswer: "same" },
  { id: "fc-08", type: "focus_match", correctAnswer: "different" },

  { id: "es-01", type: "essay" },
  { id: "es-02", type: "essay" },
  { id: "es-03", type: "essay" },
  { id: "es-04", type: "essay" },
  { id: "es-05", type: "essay" },
  { id: "es-06", type: "essay" },
];

function getQuestionMeta(id) {
  return QUESTION_BANK.find((q) => q.id === id) || null;
}

module.exports = { QUESTION_BANK, getQuestionMeta };
