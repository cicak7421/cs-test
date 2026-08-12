// public/js/test.js

(function () {
  const candidateId = sessionStorage.getItem("candidate_id");
  const startedAtStr = sessionStorage.getItem("started_at");
  const limitMinutes = parseInt(
    sessionStorage.getItem("knowledge_time_limit_minutes") ||
      String(TEST_CONFIG.knowledgeTimeLimitMinutes),
    10
  );

  if (!candidateId || !startedAtStr) {
    window.location.href = "/index.html";
    return;
  }

  document.getElementById("ticketNo").textContent =
    "TIKET #" + candidateId.slice(0, 8).toUpperCase();

  const container = document.getElementById("questionsContainer");
  const errorBox = document.getElementById("errorBox");
  const submitBtn = document.getElementById("submitBtn");

  let submitted = false;
  const responses = {}; // question_id -> answer value

  // ---------- Render soal ----------
  QUESTION_BANK.forEach((q, idx) => {
    const block = document.createElement("div");
    block.className = "q-block";

    const TYPE_LABEL = {
      multiple_choice: "PILIHAN GANDA",
      focus_match: "TES FOKUS",
      essay: "ESAI",
    };

    const indexLabel = document.createElement("span");
    indexLabel.className = "q-index";
    indexLabel.textContent = `SOAL ${idx + 1} DARI ${QUESTION_BANK.length} — ${
      TYPE_LABEL[q.type] || "ESAI"
    }`;
    block.appendChild(indexLabel);

    const textEl = document.createElement("div");
    textEl.className = "q-text";
    textEl.textContent = q.text;
    block.appendChild(textEl);

    if (q.type === "multiple_choice") {
      q.options.forEach((opt, optIdx) => {
        const row = document.createElement("label");
        row.className = "option-row";
        row.innerHTML = `
          <input type="radio" name="${q.id}" value="${optIdx}" />
          <span>${opt}</span>
        `;
        row.addEventListener("click", () => {
          block.querySelectorAll(".option-row").forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
          responses[q.id] = String(optIdx);
        });
        block.appendChild(row);
      });
    } else if (q.type === "focus_match") {
      const pairWrap = document.createElement("div");
      pairWrap.className = "focus-pair";
      pairWrap.innerHTML = `
        <div class="focus-pair-box">${q.pairA}</div>
        <div class="focus-pair-box">${q.pairB}</div>
      `;
      block.appendChild(pairWrap);

      const choiceRow = document.createElement("div");
      choiceRow.className = "focus-choice-row";
      [
        { label: "SAMA PERSIS", value: "same" },
        { label: "BERBEDA", value: "different" },
      ].forEach((choice) => {
        const btn = document.createElement("div");
        btn.className = "focus-choice-btn";
        btn.textContent = choice.label;
        btn.addEventListener("click", () => {
          choiceRow.querySelectorAll(".focus-choice-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          responses[q.id] = choice.value;
        });
        choiceRow.appendChild(btn);
      });
      block.appendChild(choiceRow);
    } else {
      const textarea = document.createElement("textarea");
      textarea.placeholder = "Tulis jawabanmu di sini...";
      textarea.addEventListener("input", () => {
        responses[q.id] = textarea.value;
      });
      block.appendChild(textarea);
    }

    container.appendChild(block);
  });

  // ---------- Timer ----------
  const timerValueEl = document.getElementById("timerValue");
  const timerBoxEl = document.getElementById("timerBox");
  const startedAt = new Date(startedAtStr).getTime();
  const deadline = startedAt + limitMinutes * 60 * 1000;

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function tick() {
    if (submitted) return;
    const remaining = deadline - Date.now();
    timerValueEl.textContent = formatTime(remaining);

    if (remaining <= 60000) timerBoxEl.classList.add("warning");

    if (remaining <= 0) {
      doSubmit(true);
      return;
    }
    requestAnimationFrame(() => setTimeout(tick, 250));
  }
  tick();

  // ---------- Submit ----------
  async function doSubmit(autoSubmitted) {
    if (submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = autoSubmitted ? "Waktu habis, mengirim otomatis..." : "Mengirim...";

    const answers = QUESTION_BANK.map((q) => ({
      question_id: q.id,
      question_type: q.type,
      question_text: q.text,
      answer: responses[q.id] !== undefined ? responses[q.id] : "",
    }));

    try {
      const res = await fetch("/api/submit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          answers,
          auto_submitted: autoSubmitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim jawaban.");

      window.location.href = "/complaint.html";
    } catch (err) {
      errorBox.innerHTML = `<div class="error-box">${err.message} — mengarahkan ke bagian berikutnya...</div>`;
      // Tetap lanjut ke bagian berikutnya walau gagal simpan, supaya kandidat tidak stuck.
      setTimeout(() => (window.location.href = "/complaint.html"), 2500);
    }
  }

  submitBtn.addEventListener("click", () => doSubmit(false));
})();
