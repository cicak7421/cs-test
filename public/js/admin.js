// public/js/admin.js — Panel HR PT Tre Joy Ease Indonesia
(function () {
  const token = sessionStorage.getItem("admin_token");
  if (!token) { window.location.href = "/admin-login.html"; return; }

  const $ = (id) => document.getElementById(id);
  const tableBody = $("tableBody"), errorBox = $("errorBox");
  const drawer = $("drawer"), drawerPanel = $("drawerPanel");
  let all = [];

  const STATUS = {
    in_progress: ["Tes pengetahuan", "badge-progress"],
    knowledge_done: ["Simulasi komplain", "badge-knowledge"],
    completed: ["Selesai", "badge-completed"],
    expired: ["Kedaluwarsa", "badge-progress"],
  };
  const DECISION = { new: "Baru", shortlist: "Shortlist", interview: "Interview", hired: "Diterima", rejected: "Ditolak" };
  const PLATFORM = { shopee: "Shopee", tiktok: "TikTok Shop", both: "Shopee & TikTok" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");
  const objPct = (c) => (c.knowledge_total ? Math.round((c.knowledge_score / c.knowledge_total) * 100) : null);

  function tier(total) {
    if (total == null) return ["Belum dinilai", "badge-none"];
    if (total >= 80) return ["Sangat direkomendasikan", "badge-top"];
    if (total >= 65) return ["Direkomendasikan", "badge-good"];
    if (total >= 50) return ["Dipertimbangkan", "badge-mid"];
    return ["Kurang sesuai", "badge-low"];
  }
  const bar = (v) => v == null ? '<span class="muted">—</span>' : `<div class="scorebar"><b>${v}</b><div><i style="width:${v}%"></i></div></div>`;
  const flags = (c) => {
    const f = [];
    if (c.tab_switches >= 1) f.push(`Keluar halaman ${c.tab_switches}x (tes diakhiri otomatis)`);
    if (c.paste_count >= 2) f.push(`Paste ${c.paste_count}x`);
    return f;
  };

  async function api(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (res.status === 401) { sessionStorage.removeItem("admin_token"); window.location.href = "/admin-login.html"; throw new Error("Sesi habis."); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
    return data;
  }
  const showError = (m) => { errorBox.className = m ? "error-box" : ""; errorBox.textContent = m || ""; };

  // ---------- Ranking ----------
  function ranked() {
    const scored = all.filter((c) => c.total_score != null).sort((a, b) => b.total_score - a.total_score || (objPct(b) || 0) - (objPct(a) || 0));
    const rankMap = new Map(scored.map((c, i) => [c.id, i + 1]));
    return { rankMap };
  }

  function renderStats() {
    const done = all.filter((c) => c.status === "completed").length;
    const scored = all.filter((c) => c.total_score != null);
    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.total_score, 0) / scored.length) : "—";
    const top = scored.filter((c) => c.total_score >= 65).length;
    const pending = all.filter((c) => c.status === "completed" && !c.evaluated_at).length;
    $("stats").innerHTML = [
      [all.length, "Total pendaftar"], [done, "Sudah menyelesaikan tes"], [pending, "Menunggu penilaian AI"],
      [avg, "Rata-rata skor akhir"], [top, "Kandidat direkomendasikan (65+)"],
    ].map(([n, l]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
  }

  function filtered() {
    const q = $("searchInput").value.trim().toLowerCase();
    const st = $("statusFilter").value, dc = $("decisionFilter").value;
    const { rankMap } = ranked();
    return all
      .filter((c) => (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) && (!st || c.status === st) && (!dc || (c.decision || "new") === dc))
      .sort((a, b) => (rankMap.get(a.id) || 9999) - (rankMap.get(b.id) || 9999) || new Date(b.started_at) - new Date(a.started_at));
  }

  function renderTable() {
    renderStats();
    const { rankMap } = ranked();
    const rows = filtered();
    if (!rows.length) { tableBody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:24px">Belum ada kandidat yang cocok dengan filter ini.</td></tr>`; return; }
    tableBody.innerHTML = rows.map((c) => {
      const r = rankMap.get(c.id);
      const [tt, tc] = tier(c.total_score);
      const [st, sc] = STATUS[c.status] || [c.status, "badge-progress"];
      const fl = flags(c);
      return `<tr data-id="${c.id}">
        <td>${r ? `<div class="rank ${r <= 3 ? "r" + r : ""}">${r}</div>` : '<span class="muted">—</span>'}</td>
        <td><div style="font-weight:700">${esc(c.name)}</div><div class="muted" style="font-size:12px">${esc(c.email)}</div>
          <span class="badge ${sc}" style="margin-top:4px">${st}</span>${fl.length ? ` <span class="flag">⚑ ${fl.join(", ")}</span>` : ""}</td>
        <td>${bar(objPct(c))}</td><td>${bar(c.essay_score)}</td><td>${bar(c.complaint_score)}</td>
        <td>${c.total_score != null ? `<b style="font-size:18px">${c.total_score}</b>` : '<span class="muted">—</span>'}</td>
        <td><span class="badge ${tc}">${tt}</span></td>
        <td><span class="badge badge-none">${DECISION[c.decision || "new"]}</span></td></tr>`;
    }).join("");
    tableBody.querySelectorAll("tr[data-id]").forEach((row) => row.addEventListener("click", () => openDetail(row.dataset.id)));
  }

  async function load() {
    try { showError(""); all = (await api("/api/admin/results")).candidates; renderTable(); }
    catch (e) { showError(e.message); tableBody.innerHTML = ""; }
  }

  // ---------- Detail ----------
  async function openDetail(id) {
    drawer.classList.add("open");
    drawerPanel.innerHTML = '<p class="muted">Memuat detail...</p>';
    try {
      const d = await api(`/api/admin/detail?candidate_id=${id}`);
      const c = d.candidate, ev = c.ai_evaluation;
      const [tt, tc] = tier(c.total_score);
      const ring = c.total_score != null ? `conic-gradient(var(--brand) ${c.total_score * 3.6}deg, var(--line) 0)` : "var(--line)";
      const fl = flags(c);
      let h = `
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:16px">
        <div><h2 style="font-size:24px;margin-bottom:4px">${esc(c.name)}</h2>
          <div class="muted">${esc(c.email)}${c.phone ? " · " + esc(c.phone) : ""}</div>
          ${c.phone ? `<a class="link-btn" target="_blank" rel="noopener" href="https://wa.me/${esc(c.phone.replace(/\D/g, "").replace(/^0/, "62"))}">Chat WhatsApp</a>` : ""}</div>
        <button class="btn btn-ghost btn-sm" id="closeBtn" style="align-self:flex-start">Tutup</button></div>

      <div class="panel-card"><div class="score-hero">
        <div class="score-ring" style="background:${ring}"><span>${c.total_score ?? "—"}</span></div>
        <div style="flex:1;min-width:220px"><span class="badge ${tc}">${tt}</span>
          <div class="mini-scores" style="margin-top:10px">
            <div><b>${objPct(c) ?? "—"}</b><small>Pilihan ganda</small></div>
            <div><b>${c.essay_score ?? "—"}</b><small>Esai</small></div>
            <div><b>${c.complaint_score ?? "—"}</b><small>Simulasi</small></div></div></div></div>
        ${c.status === "completed" ? `<button class="btn btn-primary btn-sm btn-block" id="evalBtn" style="margin-top:14px">${c.evaluated_at ? "Nilai ulang dengan AI" : "Nilai dengan AI"}</button>` : `<p class="muted" style="margin:12px 0 0;font-size:13px">Penilaian AI tersedia setelah kandidat menyelesaikan seluruh tes.</p>`}
      </div>`;

      if (ev) {
        h += `<div class="panel-card"><h3 style="font-size:16px;margin-bottom:8px">Ringkasan AI</h3>${ev.objective_missing ? '<p class="muted" style="font-size:13px;margin:0 0 8px"><b>Catatan:</b> data pilihan ganda kandidat ini tidak tersimpan atau tidak dikerjakan, jadi nilainya dihitung 0.</p>' : ""}<p>${esc(ev.summary)}</p>
          ${ev.strengths?.length ? `<div class="chips">${ev.strengths.map((s) => `<span class="chip good">✓ ${esc(s)}</span>`).join("")}</div>` : ""}
          ${ev.concerns?.length ? `<div class="chips">${ev.concerns.map((s) => `<span class="chip bad">! ${esc(s)}</span>`).join("")}</div>` : ""}
          <p class="muted" style="font-size:13px;margin:12px 0 0"><b>Esai:</b> ${esc(ev.essay_notes)}<br><b>Simulasi:</b> ${esc(ev.complaint_notes)}</p></div>`;
      }

      h += `<div class="panel-card"><h3 style="font-size:16px;margin-bottom:10px">Keputusan seleksi</h3>
        <div class="seg" id="decSeg">${Object.entries(DECISION).map(([k, v]) => `<button data-k="${k}" class="${(c.decision || "new") === k ? "on" : ""}">${v}</button>`).join("")}</div>
        <label for="notes">Catatan HR</label><textarea id="notes" placeholder="Catatan interview, alasan keputusan, dll.">${esc(c.hr_notes || "")}</textarea>
        <button class="btn btn-dark btn-sm" id="saveNotes" style="margin-top:10px">Simpan catatan</button></div>

      <div class="panel-card"><h3 style="font-size:16px;margin-bottom:10px">Info sesi tes</h3>
        <div class="kv-row"><div class="k">Skor objektif</div><div>${c.knowledge_score ?? "—"} / ${c.knowledge_total ?? "—"} soal benar</div></div>
        <div class="kv-row"><div class="k">Mulai</div><div>${fmtDate(c.started_at)}</div></div>
        <div class="kv-row"><div class="k">Tes pengetahuan dikirim</div><div>${fmtDate(c.knowledge_submitted_at)}${c.auto_submitted_knowledge ? " (otomatis, waktu habis)" : ""}</div></div>
        <div class="kv-row"><div class="k">Selesai</div><div>${fmtDate(c.completed_at)}${c.auto_submitted_complaint ? " (otomatis, waktu habis)" : ""}</div></div>
        <div class="kv-row"><div class="k">Integritas</div><div>${c.tab_switches ?? 0}x keluar halaman (tes langsung diakhiri) · ${c.paste_count ?? 0}x paste di esai ${fl.length ? '<span class="flag">⚑ perlu dicek</span>' : ""}</div></div></div>

      <div class="panel-card"><h3 style="font-size:16px;margin-bottom:6px">Jawaban tes pengetahuan</h3>`;

      if (!d.answers.length) h += '<p class="muted">Belum ada jawaban.</p>';
      d.answers.forEach((a, i) => {
        const tag = a.is_correct ? '<span class="tag-correct">✓ Benar</span>' : '<span class="tag-wrong">✕ Salah</span>';
        let body;
        if (a.question_type === "multiple_choice") body = `<div class="muted">Jawaban: pilihan ke-${a.answer !== null && a.answer !== "" ? parseInt(a.answer) + 1 : "(tidak dijawab)"}</div>`;
        else if (a.question_type === "focus_match") body = `<div class="muted">Jawaban: ${{ same: "Sama persis", different: "Berbeda" }[a.answer] || "(tidak dijawab)"}</div>`;
        else body = `<div style="white-space:pre-wrap">${esc(a.answer || "(tidak dijawab)")}</div>`;
        const label = { multiple_choice: "Pilihan ganda", focus_match: "Tes ketelitian", essay: "Esai" }[a.question_type];
        h += `<div class="answer-block"><div class="muted" style="font-size:12px">Soal ${i + 1} · ${label} ${a.question_type === "essay" ? "" : tag}</div>
          <div style="font-weight:600;margin:4px 0">${esc(a.question_text || a.question_id)}</div>${body}</div>`;
      });
      h += `</div><div class="panel-card"><h3 style="font-size:16px;margin-bottom:10px">Transkrip simulasi komplain</h3>`;
      if (!d.transcripts?.length) h += '<p class="muted">Belum ada sesi simulasi.</p>';
      (d.transcripts || []).forEach((s) => {
        h += `<div class="muted" style="font-size:12px;margin-bottom:8px">${PLATFORM[s.platform] || s.platform} · ${esc(s.scenario_topic || "-")} · gaya pelanggan: ${esc(s.persona || "-")}</div>
        <div class="chat-window" style="height:auto;max-height:420px">${s.messages.map((m) => `<div class="msg ${m.role === "agent" ? "msg-agent" : "msg-customer"}"><span class="msg-role-label">${m.role === "agent" ? "Kandidat (CS)" : "Pelanggan (AI)"}</span>${esc(m.message)}</div>`).join("")}</div>`;
      });
      h += "</div>";
      drawerPanel.innerHTML = h;

      $("closeBtn").onclick = closeDrawer;
      const evalBtn = $("evalBtn");
      if (evalBtn) evalBtn.onclick = async () => {
        evalBtn.disabled = true; evalBtn.textContent = "AI sedang menilai (sekitar 10-30 detik)...";
        try { await api("/api/admin/evaluate", { method: "POST", body: JSON.stringify({ candidate_id: id }) }); await load(); openDetail(id); }
        catch (e) { evalBtn.disabled = false; evalBtn.textContent = "Coba lagi"; alert(e.message); }
      };
      $("decSeg").querySelectorAll("button").forEach((b) => b.onclick = async () => {
        await api("/api/admin/update", { method: "POST", body: JSON.stringify({ candidate_id: id, decision: b.dataset.k }) });
        $("decSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        const row = all.find((x) => x.id === id); if (row) row.decision = b.dataset.k; renderTable();
      });
      $("saveNotes").onclick = async (e) => {
        await api("/api/admin/update", { method: "POST", body: JSON.stringify({ candidate_id: id, hr_notes: $("notes").value }) });
        e.target.textContent = "Tersimpan"; setTimeout(() => (e.target.textContent = "Simpan catatan"), 1500);
      };
    } catch (e) {
      drawerPanel.innerHTML = `<div class="error-box">${esc(e.message)}</div><button class="btn btn-ghost btn-sm" id="closeBtn">Tutup</button>`;
      $("closeBtn").onclick = closeDrawer;
    }
  }
  const closeDrawer = () => drawer.classList.remove("open");
  drawer.addEventListener("click", (e) => { if (e.target === drawer) closeDrawer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  // ---------- Nilai massal & ekspor ----------
  $("evalAllBtn").onclick = async (e) => {
    const todo = all.filter((c) => c.status === "completed" && !c.evaluated_at);
    if (!todo.length) { alert("Semua kandidat yang sudah selesai sudah dinilai."); return; }
    const btn = e.target; btn.disabled = true;
    let ok = 0;
    for (let i = 0; i < todo.length; i++) {
      btn.textContent = `Menilai ${i + 1} dari ${todo.length}...`;
      try { await api("/api/admin/evaluate", { method: "POST", body: JSON.stringify({ candidate_id: todo[i].id }) }); ok++; } catch (_) {}
    }
    btn.disabled = false; btn.textContent = "Nilai semua yang belum dinilai";
    await load();
    if (ok < todo.length) showError(`${todo.length - ok} kandidat gagal dinilai. Coba lagi beberapa saat.`);
  };

  $("exportBtn").onclick = () => {
    const { rankMap } = ranked();
    const head = ["Peringkat", "Nama", "Email", "WhatsApp", "Pilihan ganda", "Esai", "Simulasi", "Skor akhir", "Rekomendasi", "Keputusan", "Pindah tab", "Paste", "Waktu mulai"];
    const rows = filtered().map((c) => [rankMap.get(c.id) || "", c.name, c.email, c.phone || "", objPct(c) ?? "", c.essay_score ?? "", c.complaint_score ?? "", c.total_score ?? "", tier(c.total_score)[0], DECISION[c.decision || "new"], c.tab_switches ?? 0, c.paste_count ?? 0, fmtDate(c.started_at)]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `kandidat-cs-tre-joy-ease-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  $("logoutBtn").onclick = () => { sessionStorage.removeItem("admin_token"); window.location.href = "/admin-login.html"; };
  $("refreshBtn").onclick = load;
  $("searchInput").addEventListener("input", renderTable);
  $("statusFilter").addEventListener("change", renderTable);
  $("decisionFilter").addEventListener("change", renderTable);
  load();
})();
