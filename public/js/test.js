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
    "Sesi #" + candidateId.slice(0, 8).toUpperCase();

  const container = document.getElementById("questionsContainer");
  const errorBox = document.getElementById("errorBox");
  const submitBtn = document.getElementById("submitBtn");

  let submitted = false;
  const responses = {}; // question_id -> answer value

  // ---------- Integritas: catat pindah tab & paste ----------
  let tabSwitches = 0;
  let pasteCount = 0;
  Guard.start(() => {
    if (submitted) return;
    tabSwitches = 1;
    terminateTest();
  });

  // ---------- Progres ----------
  const progressBar = document.getElementById("progressBar");
  const answeredText = document.getElementById("answeredText");
  function updateProgress() {
    const done = QUESTION_BANK.filter((q) => (responses[q.id] || "").toString().trim() !== "").length;
    progressBar.style.width = (done / QUESTION_BANK.length) * 100 + "%";
    answeredText.textContent = `${done} dari ${QUESTION_BANK.length} terjawab`;
  }
  updateProgress();

  // ---------- Render soal ----------
  QUESTION_BANK.forEach((q, idx) => {
    const block = document.createElement("div");
    block.className = "q-block";

    const TYPE_LABEL = {
      multiple_choice: "Pilihan ganda",
      focus_match: "Tes ketelitian",
      essay: "Esai",
    };

    const indexLabel = document.createElement("span");
    indexLabel.className = "q-index";
    indexLabel.textContent = `Soal ${idx + 1} dari ${QUESTION_BANK.length} · ${
      TYPE_LABEL[q.type] || "Esai"
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
          updateProgress();
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
        { label: "Sama persis", value: "same" },
        { label: "Berbeda", value: "different" },
      ].forEach((choice) => {
        const btn = document.createElement("div");
        btn.className = "focus-choice-btn";
        btn.textContent = choice.label;
        btn.addEventListener("click", () => {
          choiceRow.querySelectorAll(".focus-choice-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          responses[q.id] = choice.value;
          updateProgress();
        });
        choiceRow.appendChild(btn);
      });
      block.appendChild(choiceRow);
    } else {
      const textarea = document.createElement("textarea");
      textarea.placeholder = "Tulis jawabanmu di sini...";
      textarea.addEventListener("input", () => {
        responses[q.id] = textarea.value;
        updateProgress();
      });
      textarea.addEventListener("paste", () => { pasteCount += 1; });
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

  function buildAnswers() {
    return QUESTION_BANK.map((q) => ({
      question_id: q.id,
      question_type: q.type,
      question_text: q.text,
      answer: responses[q.id] !== undefined ? responses[q.id] : "",
    }));
  }

  // ---------- Tes diakhiri karena kandidat keluar halaman ----------
  // Jawaban yang sudah terisi dikirim dengan terminate:true, sehingga sesi langsung
  // berstatus selesai (simulasi komplain dilewati). keepalive supaya request tetap
  // terkirim walau halaman sedang di-minimize atau ditutup.
  function terminateTest() {
    if (submitted) return;
    submitted = true;
    submitBtn.disabled = true;

    const req = fetch("/api/submit-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        candidate_id: candidateId,
        answers: buildAnswers(),
        auto_submitted: true,
        terminate: true,
        tab_switches: tabSwitches,
        paste_count: pasteCount,
      }),
    }).catch(() => {});

    const wait = new Promise((r) => setTimeout(r, 2500));
    Promise.race([req, wait]).then(() => {
      sessionStorage.clear();
      window.location.href = "/done.html?r=violation";
    });
  }

  // ---------- Submit ----------
  async function doSubmit(autoSubmitted) {
    if (submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = autoSubmitted ? "Waktu habis, mengirim otomatis..." : "Mengirim...";

    const answers = buildAnswers();

    try {
      // Coba sampai 3x supaya jawaban tidak hilang karena gangguan koneksi sesaat.
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch("/api/submit-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidate_id: candidateId,
              answers,
              auto_submitted: autoSubmitted,
              tab_switches: tabSwitches,
              paste_count: pasteCount,
            }),
          });
          const data = await res.json();
          if (res.status === 409) break; // sudah pernah tersimpan, lanjut saja
          if (!res.ok) throw new Error(data.error || "Gagal mengirim jawaban.");
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1200));
        }
      }
      if (lastErr) throw lastErr;

      window.location.href = "/complaint.html";
    } catch (err) {
      errorBox.innerHTML = `<div class="error-box">${err.message} — mengarahkan ke bagian berikutnya...</div>`;
      // Tetap lanjut ke bagian berikutnya walau gagal simpan, supaya kandidat tidak stuck.
      setTimeout(() => (window.location.href = "/complaint.html"), 2500);
    }
  }

  submitBtn.addEventListener("click", () => doSubmit(false));
})();
