// api/_lib/scoring.js
// Rumus skor akhir kandidat CS (0-100). Bobot bisa diubah di sini.
//  - Objektif (pilihan ganda + tes ketelitian): 30%
//  - Esai (dinilai AI dengan rubrik):            30%
//  - Simulasi komplain (dinilai AI):             40%
// Simulasi komplain diberi bobot terbesar karena paling mirip pekerjaan CS sebenarnya.

const WEIGHTS = { objective: 0.3, essay: 0.3, complaint: 0.4 };

function objectivePercent(score, total) {
  if (!total) return null;
  return Math.round(((score || 0) / total) * 100);
}

function computeTotal({ objective, essay, complaint }) {
  if ([objective, essay, complaint].some((v) => v === null || v === undefined)) return null;
  return Math.round(
    objective * WEIGHTS.objective + essay * WEIGHTS.essay + complaint * WEIGHTS.complaint
  );
}

module.exports = { WEIGHTS, objectivePercent, computeTotal };
