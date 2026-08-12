// api/_lib/groqRouter.js
// AI Router: mencoba GROQ_API_KEY_1 s/d GROQ_API_KEY_6 secara berurutan.
// Kalau satu key error (invalid, rate-limited, down, dsb), otomatis pindah ke key berikutnya.

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getKeyPool() {
  const keys = [];
  for (let i = 1; i <= 6; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim()) keys.push({ index: i, key: key.trim() });
  }
  return keys;
}

/**
 * Panggil Groq chat completion dengan auto-failover antar API key.
 * @param {Array} messages - array {role, content}
 * @param {Object} opts - { model, temperature, max_tokens }
 * @returns {Promise<{text: string, usedKeyIndex: number, attempts: Array}>}
 */
async function callGroqWithRouter(messages, opts = {}) {
  const pool = getKeyPool();
  if (pool.length === 0) {
    throw new Error(
      "Tidak ada GROQ_API_KEY_1..6 yang terpasang di environment variables."
    );
  }

  const attempts = [];
  let lastError = null;

  for (const { index, key } of pool) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: opts.model || DEFAULT_MODEL,
          messages,
          temperature: opts.temperature ?? 0.8,
          max_tokens: opts.max_tokens ?? 400,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        attempts.push({ keyIndex: index, status: res.status, ok: false });
        lastError = new Error(
          `GROQ_API_KEY_${index} gagal (HTTP ${res.status}): ${errBody.slice(0, 200)}`
        );
        continue; // coba key berikutnya
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || "";

      if (!text) {
        attempts.push({ keyIndex: index, status: res.status, ok: false, note: "empty response" });
        lastError = new Error(`GROQ_API_KEY_${index} mengembalikan respons kosong.`);
        continue;
      }

      attempts.push({ keyIndex: index, status: res.status, ok: true });
      return { text, usedKeyIndex: index, attempts };
    } catch (err) {
      attempts.push({ keyIndex: index, ok: false, error: String(err.message || err) });
      lastError = err;
      continue; // lanjut ke key berikutnya
    }
  }

  // Semua key sudah dicoba dan gagal semua
  const summary = attempts
    .map((a) => `key${a.keyIndex}:${a.ok ? "ok" : "fail"}`)
    .join(", ");
  const finalError = new Error(
    `Semua GROQ_API_KEY (1-${pool.length}) gagal dipakai. Detail: ${summary}. Error terakhir: ${lastError?.message}`
  );
  finalError.attempts = attempts;
  throw finalError;
}

module.exports = { callGroqWithRouter, getKeyPool };
