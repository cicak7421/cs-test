// public/js/complaint.js

(function () {
  const candidateId = sessionStorage.getItem("candidate_id");
  const limitMinutes = parseInt(
    sessionStorage.getItem("complaint_time_limit_minutes") || "10",
    10
  );

  if (!candidateId) {
    window.location.href = "/index.html";
    return;
  }

  document.getElementById("ticketNo").textContent =
    "TIKET #" + candidateId.slice(0, 8).toUpperCase();

  const chatWindow = document.getElementById("chatWindow");
  const loadingState = document.getElementById("loadingState");
  const replyInput = document.getElementById("replyInput");
  const sendBtn = document.getElementById("sendBtn");
  const finishBtn = document.getElementById("finishBtn");
  const finishHint = document.getElementById("finishHint");
  const errorBox = document.getElementById("errorBox");
  const platformLabel = document.getElementById("platformLabel");

  const minExchanges =
    (typeof TEST_CONFIG !== "undefined" && TEST_CONFIG.minComplaintExchanges) || 3;

  let simulationId = null;
  let ended = false;
  let finished = false;
  let agentTurns = 0;

  function updateFinishGate() {
    if (finished) return;
    if (ended || agentTurns >= minExchanges) {
      finishBtn.disabled = false;
      finishHint.textContent = ended
        ? "Percakapan sudah mencapai batas maksimal — kamu bisa menyelesaikan test."
        : "Kamu sudah bisa menyelesaikan test, atau lanjutkan membalas dulu jika mau.";
    } else {
      finishBtn.disabled = true;
      finishHint.textContent = `Balas minimal ${minExchanges}x dulu sebelum bisa menyelesaikan test (saat ini: ${agentTurns}/${minExchanges}).`;
    }
  }

  function appendMessage(role, text) {
    loadingState.style.display = "none";
    const div = document.createElement("div");
    div.className = "msg " + (role === "agent" ? "msg-agent" : "msg-customer");
    const label = document.createElement("span");
    label.className = "msg-role-label";
    label.textContent = role === "agent" ? "Kamu (CS)" : "Pelanggan";
    div.appendChild(label);
    const body = document.createElement("div");
    body.textContent = text;
    div.appendChild(body);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  updateFinishGate();

  // ---------- Timer ----------
  const timerValueEl = document.getElementById("timerValue");
  const timerBoxEl = document.getElementById("timerBox");
  const startedAt = Date.now();
  const deadline = startedAt + limitMinutes * 60 * 1000;

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function tick() {
    if (finished) return;
    const remaining = deadline - Date.now();
    timerValueEl.textContent = formatTime(remaining);
    if (remaining <= 60000) timerBoxEl.classList.add("warning");
    if (remaining <= 0) {
      doFinish(true);
      return;
    }
    setTimeout(tick, 250);
  }

  // ---------- Mulai simulasi ----------
  async function startSimulation() {
    try {
      const res = await fetch("/api/generate-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai simulasi.");

      simulationId = data.simulation_id;
      platformLabel.textContent =
        "Komplain via " + (data.platform === "shopee" ? "Shopee" : "TikTok Shop");
      appendMessage("ai_customer", data.opening_message);

      replyInput.disabled = false;
      sendBtn.disabled = false;
      updateFinishGate();
      tick();
    } catch (err) {
      loadingState.textContent = "";
      errorBox.innerHTML = `<div class="error-box">${err.message}</div>`;
    }
  }

  // ---------- Kirim balasan ----------
  async function sendReply() {
    const text = replyInput.value.trim();
    if (!text || ended || finished) return;

    appendMessage("agent", text);
    replyInput.value = "";
    sendBtn.disabled = true;
    replyInput.disabled = true;

    try {
      const res = await fetch("/api/save-complaint-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulation_id: simulationId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim balasan.");

      agentTurns += 1;

      if (data.ai_reply) {
        appendMessage("ai_customer", data.ai_reply);
      }

      if (data.conversation_ended) {
        ended = true;
        errorBox.innerHTML = `<div class="error-box" style="border-color:var(--teal); color:var(--teal-deep); background:rgba(47,111,107,0.08);">
          Percakapan simulasi sudah mencapai batas maksimal. Klik "Selesaikan Test" untuk lanjut.
        </div>`;
      } else {
        replyInput.disabled = false;
        sendBtn.disabled = false;
        replyInput.focus();
      }
      updateFinishGate();
    } catch (err) {
      errorBox.innerHTML = `<div class="error-box">${err.message}</div>`;
      replyInput.disabled = false;
      sendBtn.disabled = false;
    }
  }

  // ---------- Selesaikan test ----------
  async function doFinish(autoSubmitted) {
    if (finished) return;
    finished = true;
    finishBtn.disabled = true;
    finishBtn.textContent = autoSubmitted ? "Waktu habis, menyelesaikan..." : "Menyelesaikan...";
    replyInput.disabled = true;
    sendBtn.disabled = true;

    try {
      await fetch("/api/finish-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, auto_submitted: autoSubmitted }),
      });
    } catch (e) {
      // lanjut saja walau gagal, jangan buat kandidat stuck
    }

    sessionStorage.clear();
    window.location.href = "/done.html";
  }

  sendBtn.addEventListener("click", sendReply);
  replyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  });
  finishBtn.addEventListener("click", () => doFinish(false));

  startSimulation();
})();
