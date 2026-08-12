// public/js/admin.js

(function () {
  const token = sessionStorage.getItem("admin_token");
  if (!token) {
    window.location.href = "/admin-login.html";
    return;
  }

  const tableBody = document.getElementById("tableBody");
  const errorBox = document.getElementById("errorBox");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const detailOverlay = document.getElementById("detailOverlay");
  const detailPanel = document.getElementById("detailPanel");

  let allCandidates = [];

  const STATUS_LABEL = {
    in_progress: { text: "Tes Pengetahuan", cls: "badge-progress" },
    knowledge_done: { text: "Simulasi Komplain", cls: "badge-knowledge" },
    completed: { text: "Selesai", cls: "badge-completed" },
    expired: { text: "Kedaluwarsa", cls: "badge-progress" },
  };

  const PLATFORM_LABEL = { shopee: "Shopee", tiktok: "TikTok Shop", both: "Shopee & TikTok" };

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  }

  async function authedFetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_token");
      window.location.href = "/admin-login.html";
      throw new Error("Session habis, silakan login ulang.");
    }
    return res;
  }

  function renderTable() {
    const q = searchInput.value.trim().toLowerCase();
    const statusQ = statusFilter.value;

    const filtered = allCandidates.filter((c) => {
      const matchQ =
        !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      const matchStatus = !statusQ || c.status === statusQ;
      return matchQ && matchStatus;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:20px;">Tidak ada data yang cocok.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered
      .map((c) => {
        const status = STATUS_LABEL[c.status] || { text: c.status, cls: "badge-progress" };
        const score =
          c.knowledge_total != null
            ? `${c.knowledge_score ?? 0}/${c.knowledge_total}`
            : "—";
        return `
          <tr data-id="${c.id}" style="cursor:pointer;">
            <td>
              <div style="font-weight:600;">${escapeHtml(c.name)}</div>
              <div class="muted" style="font-size:12px;">${escapeHtml(c.email)}</div>
            </td>
            <td class="mono">${score}</td>
            <td><span class="badge ${status.cls}">${status.text}</span></td>
            <td class="muted" style="font-size:12px;">${fmtDate(c.started_at)}</td>
            <td><button class="link-btn" data-id="${c.id}">Lihat detail →</button></td>
          </tr>
        `;
      })
      .join("");

    tableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => openDetail(row.getAttribute("data-id")));
    });
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  async function loadCandidates() {
    try {
      const res = await authedFetch("/api/admin/results");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data.");
      allCandidates = data.candidates;
      renderTable();
    } catch (err) {
      errorBox.innerHTML = `<div class="error-box">${err.message}</div>`;
      tableBody.innerHTML = "";
    }
  }

  async function openDetail(candidateId) {
    detailOverlay.classList.add("open");
    detailPanel.innerHTML = `<p class="muted">Memuat detail...</p>`;

    try {
      const res = await authedFetch(`/api/admin/detail?candidate_id=${candidateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat detail.");

      const c = data.candidate;
      const status = STATUS_LABEL[c.status] || { text: c.status, cls: "badge-progress" };

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <h2 style="margin:0 0 4px;">${escapeHtml(c.name)}</h2>
            <div class="muted">${escapeHtml(c.email)} ${c.phone ? "· " + escapeHtml(c.phone) : ""}</div>
          </div>
          <button class="btn btn-ghost" id="closeDetailBtn" style="padding:8px 14px; font-size:13px;">Tutup ✕</button>
        </div>

        <div class="kv-row"><div class="k">Status</div><div><span class="badge ${status.cls}">${status.text}</span></div></div>
        <div class="kv-row"><div class="k">Skor pilihan ganda</div><div>${c.knowledge_score ?? "—"} / ${c.knowledge_total ?? "—"}</div></div>
        <div class="kv-row"><div class="k">Mulai</div><div>${fmtDate(c.started_at)}</div></div>
        <div class="kv-row"><div class="k">Submit tes pengetahuan</div><div>${fmtDate(c.knowledge_submitted_at)} ${c.auto_submitted_knowledge ? "(otomatis, waktu habis)" : ""}</div></div>
        <div class="kv-row"><div class="k">Selesai</div><div>${fmtDate(c.completed_at)} ${c.auto_submitted_complaint ? "(otomatis, waktu habis)" : ""}</div></div>

        <hr class="divider" />
        <h3>Jawaban Tes Pengetahuan</h3>
      `;

      if (data.answers.length === 0) {
        html += `<p class="muted">Belum ada jawaban.</p>`;
      } else {
        data.answers.forEach((a, i) => {
          if (a.question_type === "multiple_choice") {
            const tag = a.is_correct
              ? `<span class="tag-correct">✓ Benar</span>`
              : `<span class="tag-wrong">✕ Salah</span>`;
            html += `
              <div class="answer-block">
                <div class="muted" style="font-size:12px;">SOAL ${i + 1} · PILIHAN GANDA ${tag}</div>
                <div style="font-weight:600; margin:4px 0;">${escapeHtml(a.question_text || a.question_id)}</div>
                <div class="muted">Jawaban kandidat: pilihan ke-${a.answer !== null && a.answer !== "" ? (parseInt(a.answer) + 1) : "(tidak dijawab)"}</div>
              </div>
            `;
          } else if (a.question_type === "focus_match") {
            const tag = a.is_correct
              ? `<span class="tag-correct">✓ Benar</span>`
              : `<span class="tag-wrong">✕ Salah</span>`;
            const label = { same: "Sama Persis", different: "Berbeda" }[a.answer] || "(tidak dijawab)";
            html += `
              <div class="answer-block">
                <div class="muted" style="font-size:12px;">SOAL ${i + 1} · TES FOKUS ${tag}</div>
                <div style="font-weight:600; margin:4px 0;">${escapeHtml(a.question_text || a.question_id)}</div>
                <div class="muted">Jawaban kandidat: ${label}</div>
              </div>
            `;
          } else {
            html += `
              <div class="answer-block">
                <div class="muted" style="font-size:12px;">SOAL ${i + 1} · ESAI</div>
                <div style="font-weight:600; margin:4px 0;">${escapeHtml(a.question_text || a.question_id)}</div>
                <div style="white-space:pre-wrap;">${escapeHtml(a.answer || "(tidak dijawab)")}</div>
              </div>
            `;
          }
        });
      }

      html += `<hr class="divider" /><h3>Transkrip Simulasi Komplain (AI)</h3>`;

      if (!data.transcripts || data.transcripts.length === 0) {
        html += `<p class="muted">Belum ada sesi simulasi.</p>`;
      } else {
        data.transcripts.forEach((sim) => {
          html += `
            <div style="margin-bottom: 14px;">
              <div class="muted" style="font-size:12px; margin-bottom:8px;">
                Platform: ${PLATFORM_LABEL[sim.platform] || sim.platform} · Skenario: ${escapeHtml(sim.scenario_topic || "-")}
              </div>
              <div class="chat-window" style="max-height:none; background:var(--ink); padding:12px; border-radius:8px;">
                ${sim.messages
                  .map(
                    (m) => `
                  <div class="msg ${m.role === "agent" ? "msg-agent" : "msg-customer"}">
                    <span class="msg-role-label">${m.role === "agent" ? "Kandidat (CS)" : "Pelanggan (AI)"}</span>
                    <div>${escapeHtml(m.message)}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `;
        });
      }

      detailPanel.innerHTML = html;
      document.getElementById("closeDetailBtn").addEventListener("click", closeDetail);
    } catch (err) {
      detailPanel.innerHTML = `<div class="error-box">${err.message}</div><button class="btn btn-ghost" id="closeDetailBtn" style="margin-top:12px;">Tutup</button>`;
      const btn = document.getElementById("closeDetailBtn");
      if (btn) btn.addEventListener("click", closeDetail);
    }
  }

  function closeDetail() {
    detailOverlay.classList.remove("open");
  }

  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay) closeDetail();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("admin_token");
    window.location.href = "/admin-login.html";
  });

  document.getElementById("refreshBtn").addEventListener("click", loadCandidates);
  searchInput.addEventListener("input", renderTable);
  statusFilter.addEventListener("change", renderTable);

  loadCandidates();
})();
