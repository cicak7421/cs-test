// api/_lib/groqRouter.js
// AI Router Groq:
//  - Failover antar API key: GROQ_API_KEY_1 s/d GROQ_API_KEY_6
//  - AUTO-DETECT model aktif: ambil daftar model dari GET /openai/v1/models,
//    filter hanya model chat yang aktif, urutkan berdasarkan prioritas, lalu coba satu per satu.
//    Kalau model dipensiunkan/tidak ditemukan/rate-limit, otomatis pindah ke model berikutnya.
//
// Env opsional:
//   GROQ_MODEL = id model yang mau diprioritaskan paling depan (kalau masih aktif)

const GROQ_BASE = "https://api.groq.com/openai/v1";
const CHAT_ENDPOINT = `${GROQ_BASE}/chat/completions`;
const MODELS_ENDPOINT = `${GROQ_BASE}/models`;

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000; // cache daftar model 10 menit
const MAX_MODELS_PER_KEY = 4; // batas percobaan model per key biar tidak timeout di Vercel

// Cadangan kalau endpoint /models sendiri gagal
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
];

// Model non-chat (audio, moderasi, embedding) dibuang
const EXCLUDE_PATTERN = /whisper|tts|playai|orpheus|guard|safeguard|moderation|embed|transcribe|speech/i;

// Urutan prioritas (yang cocok duluan dipakai duluan). Sisanya menyusul berdasarkan context window.
const PRIORITY_PATTERNS = [
  /^llama-3\.3-70b/i,
  /gpt-oss-120b/i,
  /llama-4-maverick/i,
  /llama-4-scout/i,
  /kimi/i,
  /qwen/i,
  /llama-3\.1-70b/i,
  /gpt-oss-20b/i,
  /llama-3\.1-8b/i,
];

let modelCache = { models: null, fetchedAt: 0 };

function getKeyPool() {
  const keys = [];
  for (let i = 1; i <= 6; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim()) keys.push({ index: i, key: key.trim() });
  }
  return keys;
}

function rankModels(list) {
  const score = (m) => {
    const idx = PRIORITY_PATTERNS.findIndex((p) => p.test(m.id));
    return idx === -1 ? PRIORITY_PATTERNS.length : idx;
  };
  return [...list].sort((a, b) => {
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return (b.context_window || 0) - (a.context_window || 0);
  });
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ambil daftar model chat yang aktif dari Groq (dengan cache).
 * @returns {Promise<string[]>} id model, urut dari prioritas tertinggi
 */
async function getActiveModels(apiKey, { forceRefresh = false } = {}) {
  const fresh = Date.now() - modelCache.fetchedAt < MODEL_CACHE_TTL_MS;
  if (!forceRefresh && modelCache.models && fresh) return modelCache.models;

  try {
    const res = await fetchWithTimeout(
      MODELS_ENDPOINT,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      8000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const active = (json?.data || []).filter(
      (m) => m?.id && m.active !== false && !EXCLUDE_PATTERN.test(m.id)
    );
    if (active.length === 0) throw new Error("daftar model kosong");

    let ids = rankModels(active).map((m) => m.id);

    // Model favorit dari env dinaikkan ke posisi pertama (kalau memang masih aktif)
    const preferred = (process.env.GROQ_MODEL || "").trim();
    if (preferred && ids.includes(preferred)) {
      ids = [preferred, ...ids.filter((id) => id !== preferred)];
    }

    modelCache = { models: ids, fetchedAt: Date.now() };
    return ids;
  } catch (err) {
    console.warn("[groqRouter] gagal ambil daftar model, pakai cadangan:", err.message);
    // Kalau ada cache lama, lebih baik dipakai daripada list statis
    return modelCache.models || FALLBACK_MODELS;
  }
}

// Model sudah pensiun / tidak ada / tidak boleh dipakai -> ganti model, bukan ganti key
function isModelProblem(status, body) {
  if (status === 404) return true;
  if (status === 400 || status === 403) {
    return /model_decommissioned|model_not_found|decommissioned|does not exist|not supported|no longer supported|terms/i.test(
      body || ""
    );
  }
  return false;
}

// Buang blok <think>...</think> dari model reasoning
function cleanText(text) {
  return (text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Panggil Groq chat completion dengan auto-failover key + auto-pilih model aktif.
 * @param {Array} messages - array {role, content}
 * @param {Object} opts - { model (opsional, dipaksa dicoba duluan), temperature, max_tokens }
 * @returns {Promise<{text: string, usedKeyIndex: number, usedModel: string, attempts: Array}>}
 */
async function callGroqWithRouter(messages, opts = {}) {
  const pool = getKeyPool();
  if (pool.length === 0) {
    throw new Error("Tidak ada GROQ_API_KEY_1..6 yang terpasang di environment variables.");
  }

  const attempts = [];
  let lastError = null;
  let refreshedModels = false;

  for (const { index, key } of pool) {
    let models = await getActiveModels(key);
    if (opts.model) models = [opts.model, ...models.filter((m) => m !== opts.model)];
    models = models.slice(0, MAX_MODELS_PER_KEY);

    let keyDead = false;

    for (const model of models) {
      if (keyDead) break;
      try {
        const res = await fetchWithTimeout(
          CHAT_ENDPOINT,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: opts.temperature ?? 0.8,
              max_tokens: opts.max_tokens ?? 400,
            }),
          },
          20000
        );

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          attempts.push({ keyIndex: index, model, status: res.status, ok: false });
          lastError = new Error(
            `key${index}/${model} gagal (HTTP ${res.status}): ${errBody.slice(0, 200)}`
          );

          if (isModelProblem(res.status, errBody)) {
            // Model bermasalah -> buang cache biar refresh, lanjut model berikutnya
            if (!refreshedModels) {
              modelCache = { models: null, fetchedAt: 0 };
              refreshedModels = true;
            }
            continue;
          }
          if (res.status === 429 || res.status === 413) continue; // limit model ini, coba model lain
          if (res.status === 401) {
            keyDead = true; // key invalid, langsung ganti key
            continue;
          }
          continue;
        }

        const data = await res.json();
        const text = cleanText(data?.choices?.[0]?.message?.content);

        if (!text) {
          attempts.push({ keyIndex: index, model, status: res.status, ok: false, note: "empty response" });
          lastError = new Error(`key${index}/${model} mengembalikan respons kosong.`);
          continue;
        }

        attempts.push({ keyIndex: index, model, status: res.status, ok: true });
        return { text, usedKeyIndex: index, usedModel: model, attempts };
      } catch (err) {
        attempts.push({ keyIndex: index, model, ok: false, error: String(err.message || err) });
        lastError = err;
      }
    }
  }

  const summary = attempts
    .map((a) => `key${a.keyIndex}/${a.model}:${a.ok ? "ok" : a.status || "err"}`)
    .join(", ");
  const finalError = new Error(
    `Semua GROQ key/model gagal. Detail: ${summary}. Error terakhir: ${lastError?.message}`
  );
  finalError.attempts = attempts;
  throw finalError;
}

module.exports = { callGroqWithRouter, getKeyPool, getActiveModels };
