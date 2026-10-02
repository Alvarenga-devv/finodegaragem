/**
 * FINO DE GARAGEM — painel administrativo (pages/admin.html)
 * Acesso: role "admin" apenas. Funcionário (barber) não acessa esta tela.
 */
(function (global) {
  "use strict";
  const { db, ui, auth, agenda } = global.FDG;

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  let user;
  let agendaDate = new Date();
  let agendaProfessionalId = null;

  function init() {
    user = auth.requireRole(["admin"], "login.html");
    if (!user) return;
    document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = user.name));
    document.querySelectorAll("[data-user-initials]").forEach((el) => (el.textContent = ui.initials(user.name)));

    bindSectionNav();
    renderDashboard();
    renderAgendaSection();
    renderAppointmentsSection();
    renderClientsSection();
    renderServicesSection();
    renderHoursSection();
    renderBlocksSection();
    renderFinanceSection();
    renderCommissionsSection();
    renderSettingsSection();
  }

  // ------------------------------------------------------------------ nav
  function bindSectionNav() {
    qsa("[data-section-link]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        qsa("[data-section-link]").forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        qsa("[data-section]").forEach((sec) => sec.classList.add("hide"));
        qs(`[data-section="${link.dataset.sectionLink}"]`)?.classList.remove("hide");
        document.querySelector(".app-sidebar")?.classList.remove("open");
      });
    });
  }

  // ------------------------------------------------------------- dashboard
  function renderDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const todaySummary = db.getRevenueSummary({ dateFrom: today, dateTo: today });
    const weekSummary = db.getRevenueSummary({ dateFrom: agenda.dateToISO(weekStart), dateTo: today });
    const monthSummary = db.getRevenueSummary({ dateFrom: agenda.dateToISO(monthStart), dateTo: agenda.dateToISO(monthEnd) });

    setText("#dashTodayCount", todaySummary.appointmentCount);
    setText("#dashTodayDone", todaySummary.concludedCount);
    setText("#dashTodayRevenue", ui.formatBRL(todaySummary.grossRevenue));

    const nextToday = db.getAppointments({ date: today }).filter((a) => ["PENDENTE", "CONFIRMADO"].includes(a.status)).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    setText("#dashNextClient", nextToday ? `${nextToday.startTime} · ${clientName(nextToday.clientId)}` : "—");

    setText("#dashWeekCount", weekSummary.appointmentCount);
    setText("#dashWeekRevenue", ui.formatBRL(weekSummary.grossRevenue));
    const topService = mostFrequent(db.getAppointments({ dateFrom: agenda.dateToISO(weekStart), dateTo: today }).map((a) => db.getService(a.serviceId)?.name));
    setText("#dashWeekTopService", topService || "—");
    const topPro = mostFrequent(db.getAppointments({ dateFrom: agenda.dateToISO(weekStart), dateTo: today }).map((a) => db.getProfessional(a.professionalId)?.displayName));
    setText("#dashWeekTopPro", topPro || "—");

    setText("#dashMonthRevenue", ui.formatBRL(monthSummary.grossRevenue));
    setText("#dashMonthClients", new Set(db.getAppointments({ dateFrom: agenda.dateToISO(monthStart), dateTo: agenda.dateToISO(monthEnd) }).map((a) => a.clientId)).size);
    setText("#dashMonthAvgTicket", ui.formatBRL(monthSummary.concludedCount ? Math.round((monthSummary.grossRevenue / monthSummary.concludedCount) * 100) / 100 : 0));
    setText("#dashMonthCommissions", ui.formatBRL(monthSummary.totalCommissions));

    renderSimpleBarChart("#weekChart", buildWeekChartData());
  }

  function buildWeekChartData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = agenda.dateToISO(d);
      const rev = db.getRevenueSummary({ dateFrom: iso, dateTo: iso }).grossRevenue;
      days.push({ label: d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3), value: rev });
    }
    return days;
  }

  function renderSimpleBarChart(sel, data) {
    const el = qs(sel);
    if (!el) return;
    const max = Math.max(1, ...data.map((d) => d.value));
    el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:10px;height:160px;">
      ${data.map((d) => {
        const hasValue = d.value > 0;
        const height = hasValue ? Math.max(6, (d.value / max) * 120) : 3;
        const bg = hasValue ? "linear-gradient(180deg,var(--blue-bright),var(--red))" : "var(--line)";
        return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="width:100%;background:${bg};border-radius:6px 6px 2px 2px;height:${height}px;align-self:flex-end;"></div>
          <span style="font-size:11px;color:var(--muted);text-transform:uppercase;">${d.label}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  function mostFrequent(arr) {
    const counts = {};
    arr.filter(Boolean).forEach((v) => (counts[v] = (counts[v] || 0) + 1));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0];
  }

  function clientName(clientId) {
    const c = db.getClient(clientId);
    return c ? db.getUser(c.userId)?.name : "Cliente";
  }

  function setText(sel, val) { const el = qs(sel); if (el) el.textContent = val; }

  // ------------------------------------------------------------- agenda
  function renderAgendaSection() {
    const select = qs("#agendaProfessionalSelect");
    if (select) {
      select.innerHTML = db.getProfessionals().map((p) => `<option value="${p.id}">${ui.escapeHtml(p.displayName)}</option>`).join("");
      agendaProfessionalId = agendaProfessionalId || select.value;
      select.addEventListener("change", () => { agendaProfessionalId = select.value; renderAgendaDay(); });
    }
    qs("#adminAgendaPrev")?.addEventListener("click", () => { agendaDate.setDate(agendaDate.getDate() - 1); renderAgendaDay(); });
    qs("#adminAgendaNext")?.addEventListener("click", () => { agendaDate.setDate(agendaDate.getDate() + 1); renderAgendaDay(); });
    qs("#adminAgendaToday")?.addEventListener("click", () => { agendaDate = new Date(); renderAgendaDay(); });
    renderAgendaDay();
  }

  function renderAgendaDay() {
    const label = qs("#adminAgendaDateLabel");
    if (label) label.textContent = ui.formatDateLong(agenda.dateToISO(agendaDate));
    const container = qs("#adminAgendaContainer");
    if (!container || !agendaProfessionalId) return;
    agenda.renderDayAgenda(container, {
      professionalId: agendaProfessionalId,
      date: agenda.dateToISO(agendaDate),
      onStatusChange: (id) => openAppointmentDetail(id),
    });
  }

  function openAppointmentDetail(apptId) {
    const appt = db.getAppointment(apptId);
    if (!appt) return;
    const service = db.getService(appt.serviceId);
    qs("#apptDetailBody").innerHTML = `
      <p><strong>${ui.escapeHtml(clientName(appt.clientId))}</strong> — ${ui.escapeHtml(service.name)}</p>
      <p class="text-muted">${ui.formatDate(appt.date)} às ${appt.startTime} · ${ui.formatBRL(appt.price)} · Pagamento: ${appt.paymentMethod}</p>
      <div class="field">
        <label>Status</label>
        <select id="apptStatusSelect">
          ${["PENDENTE", "CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "NO_SHOW"].map((s) => `<option value="${s}" ${s === appt.status ? "selected" : ""}>${ui.statusLabel(s)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Status do pagamento</label>
        <select id="apptPaymentSelect">
          ${["pendente", "aguardando", "pago"].map((s) => `<option value="${s}" ${s === appt.paymentStatus ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>`;
    qs("#saveApptDetailBtn").onclick = () => {
      db.updateAppointmentStatus(apptId, qs("#apptStatusSelect").value);
      db.setPaymentStatus(apptId, qs("#apptPaymentSelect").value);
      ui.toast("Agendamento atualizado.", "success");
      ui.closeModal("apptDetailModal");
      renderAgendaDay(); renderAppointmentsSection(); renderDashboard(); renderFinanceSection();
    };
    ui.openModal("apptDetailModal");
  }

  function renderAppointmentsSection() {
    const wrap = qs("#allAppointmentsWrap");
    if (!wrap) return;
    const appts = db.getAppointments().sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 80);
    if (!appts.length) { wrap.innerHTML = emptyState("Nenhum agendamento ainda."); return; }
    wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${appts.map((a) => `<tr style="cursor:pointer" data-open="${a.id}"><td>${ui.formatDate(a.date)} ${a.startTime}</td><td class="strong">${ui.escapeHtml(clientName(a.clientId))}</td><td>${ui.escapeHtml(db.getService(a.serviceId).name)}</td><td>${ui.escapeHtml(db.getProfessional(a.professionalId).displayName)}</td><td>${ui.formatBRL(a.price)}</td><td><span class="${ui.statusTagClass(a.status)}">${ui.statusLabel(a.status)}</span></td></tr>`).join("")}</tbody>
    </table></div>`;
    qsa("[data-open]", wrap).forEach((row) => row.addEventListener("click", () => openAppointmentDetail(row.dataset.open)));
  }

  function emptyState(msg) { return `<div class="empty-state"><div class="icon">🗂️</div><p>${msg}</p></div>`; }

  // ------------------------------------------------------------- clientes
  function renderClientsSection() {
    const wrap = qs("#clientsWrap");
    if (!wrap) return;
    const clients = db.listClientsWithStats();
    if (!clients.length) { wrap.innerHTML = emptyState("Nenhum cliente cadastrado."); return; }
    wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nome</th><th>Telefone</th><th>Último atendimento</th><th>Atendimentos</th><th>Total gasto</th><th>Preferência</th></tr></thead>
      <tbody>${clients.map((c) => `<tr style="cursor:pointer" data-client="${c.id}">
        <td class="strong">${ui.escapeHtml(c.name)}</td><td>${ui.escapeHtml(c.phone || "—")}</td>
        <td>${c.lastVisit ? ui.formatDate(c.lastVisit) : "—"}</td><td>${c.totalAppointments}</td>
        <td>${ui.formatBRL(c.totalSpent)}</td><td>${ui.escapeHtml(c.preferredProfessional)}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
    qsa("[data-client]", wrap).forEach((row) => row.addEventListener("click", () => openClientDetail(row.dataset.client)));
  }

  function openClientDetail(clientId) {
    const client = db.getClient(clientId);
    const user_ = db.getUser(client.userId);
    const history = db.getAppointments({ clientId }).sort((a, b) => b.date.localeCompare(a.date));
    qs("#clientDetailBody").innerHTML = `
      <p><strong>${ui.escapeHtml(user_.name)}</strong></p>
      <p class="text-muted">${ui.escapeHtml(user_.email)} · ${ui.escapeHtml(user_.phone || "—")}</p>
      <div class="field"><label>Observações internas</label><textarea id="clientNotes" rows="3">${ui.escapeHtml(client.notes || "")}</textarea></div>
      <button class="btn btn-outline btn-sm" id="saveClientNotes">Salvar observações</button>
      <h4 style="margin-top:20px;font-size:13px;color:var(--bone);text-transform:uppercase;">Histórico</h4>
      ${history.length ? history.map((a) => `<div class="agenda-block status-${a.status.toLowerCase()}" style="margin-bottom:8px;"><div><strong>${ui.escapeHtml(db.getService(a.serviceId).name)}</strong><small>${ui.formatDate(a.date)} · ${ui.formatBRL(a.price)}</small></div><span class="${ui.statusTagClass(a.status)}">${ui.statusLabel(a.status)}</span></div>`).join("") : `<p class="text-muted">Sem histórico.</p>`}
    `;
    qs("#saveClientNotes").onclick = () => {
      db.updateClientNotes(clientId, qs("#clientNotes").value);
      ui.toast("Observações salvas.", "success");
    };
    ui.openModal("clientDetailModal");
  }

  // ------------------------------------------------------------- serviços
  function renderServicesSection() {
    const wrap = qs("#servicesWrap");
    if (!wrap) return;
    const services = db.getServices({ activeOnly: false });
    wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Serviço</th><th>Preço</th><th>Duração</th><th>Status</th><th></th></tr></thead>
      <tbody>${services.map((s) => `<tr>
        <td class="strong">${ui.escapeHtml(s.name)}</td>
        <td>${s.price !== null ? ui.formatBRL(s.price) : "Consultar"}</td>
        <td>${s.duration} min</td>
        <td><span class="tag ${s.active ? "tag-concluido" : "tag-cancelado"}">${s.active ? "Ativo" : "Inativo"}</span></td>
        <td><button class="btn btn-ghost btn-sm" data-edit-service="${s.id}">Editar</button></td>
      </tr>`).join("")}</tbody>
    </table></div>`;
    qsa("[data-edit-service]", wrap).forEach((btn) => btn.addEventListener("click", () => openServiceModal(btn.dataset.editService)));
    qs("#addServiceBtn")?.addEventListener("click", () => openServiceModal(null));
  }

  function openServiceModal(id) {
    const service = id ? db.getService(id) : null;
    qs("#serviceModalTitle").textContent = service ? "Editar serviço" : "Novo serviço";
    const f = qs("#serviceForm");
    f.elements.id.value = service?.id || "";
    f.elements.name.value = service?.name || "";
    f.elements.price.value = service?.price ?? "";
    f.elements.duration.value = service?.duration || 30;
    f.elements.category.value = service?.category || "";
    f.elements.description.value = service?.description || "";
    f.elements.active.checked = service ? service.active : true;
    ui.openModal("serviceModal");
  }

  function bindServiceForm() {
    const f = qs("#serviceForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const priceRaw = fd.get("price");
      db.upsertService({
        id: fd.get("id") || undefined,
        name: fd.get("name"),
        price: priceRaw === "" ? null : Number(priceRaw),
        duration: Number(fd.get("duration")),
        category: fd.get("category"),
        description: fd.get("description"),
        active: fd.get("active") === "on",
      });
      ui.toast("Serviço salvo.", "success");
      ui.closeModal("serviceModal");
      renderServicesSection();
    });
    qs("#deleteServiceBtn")?.addEventListener("click", () => {
      const id = f.elements.id.value;
      if (!id) return;
      if (!confirm("Excluir este serviço?")) return;
      db.deleteService(id);
      ui.closeModal("serviceModal");
      renderServicesSection();
    });
  }

  // ------------------------------------------------------------- horários
  function renderHoursSection() {
    const wrap = qs("#hoursWrap");
    if (!wrap) return;
    const hours = db.getBusinessHours();
    wrap.innerHTML = db.WEEKDAYS.map((label, dow) => {
      const day = hours[dow] || { open: false, intervals: [] };
      return `<div class="panel" style="margin-bottom:12px;padding:16px 20px;">
        <div class="panel-head">
          <h3>${label}</h3>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--bone-dim);">
            <input type="checkbox" data-dow="${dow}" class="day-open-toggle" ${day.open ? "checked" : ""}/> Aberto
          </label>
        </div>
        <div class="day-intervals" data-dow-intervals="${dow}" style="${day.open ? "" : "display:none;"}">
          ${(day.intervals || []).map((iv, idx) => `
            <div class="flex gap-12 mt-8" data-interval="${idx}">
              <div class="field" style="margin-bottom:0;flex:1;"><input type="time" value="${iv.start}" class="iv-start"/></div>
              <div class="field" style="margin-bottom:0;flex:1;"><input type="time" value="${iv.end}" class="iv-end"/></div>
              <button type="button" class="btn btn-ghost btn-sm remove-interval">Remover</button>
            </div>`).join("")}
          <button type="button" class="btn btn-outline btn-sm mt-8 add-interval">+ Adicionar intervalo</button>
        </div>
      </div>`;
    }).join("") + `<button class="btn btn-primary mt-16" id="saveHoursBtn">Salvar horários</button>`;

    wrap.querySelectorAll(".day-open-toggle").forEach((cb) => {
      cb.addEventListener("change", () => {
        wrap.querySelector(`[data-dow-intervals="${cb.dataset.dow}"]`).style.display = cb.checked ? "" : "none";
      });
    });
    wrap.querySelectorAll(".add-interval").forEach((btn) => {
      btn.addEventListener("click", () => {
        const container = btn.parentElement;
        const row = document.createElement("div");
        row.className = "flex gap-12 mt-8";
        row.innerHTML = `<div class="field" style="margin-bottom:0;flex:1;"><input type="time" value="09:00" class="iv-start"/></div>
          <div class="field" style="margin-bottom:0;flex:1;"><input type="time" value="12:00" class="iv-end"/></div>
          <button type="button" class="btn btn-ghost btn-sm remove-interval">Remover</button>`;
        container.insertBefore(row, btn);
        row.querySelector(".remove-interval").addEventListener("click", () => row.remove());
      });
    });
    wrap.querySelectorAll(".remove-interval").forEach((btn) => btn.addEventListener("click", () => btn.parentElement.remove()));

    qs("#saveHoursBtn").onclick = () => {
      const newHours = {};
      db.WEEKDAYS.forEach((_, dow) => {
        const open = wrap.querySelector(`.day-open-toggle[data-dow="${dow}"]`).checked;
        const intervalsWrap = wrap.querySelector(`[data-dow-intervals="${dow}"]`);
        const intervals = Array.from(intervalsWrap.querySelectorAll(".flex.gap-12.mt-8")).map((row) => ({
          start: row.querySelector(".iv-start").value,
          end: row.querySelector(".iv-end").value,
        }));
        newHours[dow] = { open, intervals: open ? intervals : [] };
      });
      db.setBusinessHours(newHours);
      ui.toast("Horário de funcionamento atualizado.", "success");
    };
  }

  // ------------------------------------------------------------- bloqueios
  function renderBlocksSection() {
    const wrap = qs("#blocksWrap");
    if (!wrap) return;
    const blocks = db.getBlockedTimes();
    if (!blocks.length) { wrap.innerHTML = emptyState("Nenhum bloqueio cadastrado."); } else {
      wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>Profissional</th><th>Data</th><th>Horário</th><th>Motivo</th><th></th></tr></thead>
        <tbody>${blocks.map((b) => `<tr>
          <td class="strong">${ui.escapeHtml(db.getProfessional(b.professionalId)?.displayName || "—")}</td>
          <td>${ui.formatDate(b.date)}</td>
          <td>${b.fullDay ? "Dia inteiro" : `${b.startTime} – ${b.endTime}`}</td>
          <td>${ui.escapeHtml(b.reason || "—")}</td>
          <td><button class="btn btn-ghost btn-sm" data-remove-block="${b.id}">Remover</button></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
      qsa("[data-remove-block]", wrap).forEach((btn) => btn.addEventListener("click", () => {
        db.removeBlockedTime(btn.dataset.removeBlock);
        renderBlocksSection(); renderAgendaDay();
      }));
    }
  }

  function bindBlockForm() {
    const select = qs("#blockProfessionalSelect");
    if (select) select.innerHTML = db.getProfessionals().map((p) => `<option value="${p.id}">${ui.escapeHtml(p.displayName)}</option>`).join("");
    qs("#openAdminBlockModal")?.addEventListener("click", () => ui.openModal("adminBlockModal"));
    qs("#adminFullDayToggle")?.addEventListener("change", (e) => {
      qs("#adminBlockTimeFields").style.display = e.target.checked ? "none" : "";
    });
    const f = qs("#adminBlockForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const fullDay = fd.get("fullDay") === "on";
      db.addBlockedTime({
        professionalId: fd.get("professionalId"),
        date: fd.get("date"),
        startTime: fullDay ? "00:00" : fd.get("startTime"),
        endTime: fullDay ? "23:59" : fd.get("endTime"),
        reason: fd.get("reason"),
        fullDay,
      });
      ui.toast("Horário bloqueado.", "success");
      ui.closeModal("adminBlockModal");
      f.reset();
      renderBlocksSection(); renderAgendaDay();
    });
  }

  // ------------------------------------------------------------- financeiro
  function renderFinanceSection() {
    const select = qs("#financePeriodSelect");
    const customWrap = qs("#financeCustomRange");
    if (select) {
      select.addEventListener("change", () => {
        customWrap.style.display = select.value === "custom" ? "flex" : "none";
        if (select.value !== "custom") computeFinance();
      });
    }
    qs("#financeApplyCustom")?.addEventListener("click", computeFinance);
    computeFinance();
  }

  function computeFinance() {
    const select = qs("#financePeriodSelect");
    let dateFrom, dateTo;
    const today = new Date().toISOString().slice(0, 10);
    const val = select ? select.value : "30";
    if (val === "custom") {
      dateFrom = qs("#financeFrom").value || today;
      dateTo = qs("#financeTo").value || today;
    } else {
      const days = Number(val);
      const from = new Date(); from.setDate(from.getDate() - (days - 1));
      dateFrom = from.toISOString().slice(0, 10);
      dateTo = today;
    }
    const summary = db.getRevenueSummary({ dateFrom, dateTo });
    setText("#financeGross", ui.formatBRL(summary.grossRevenue));
    setText("#financePaid", ui.formatBRL(summary.paid));
    setText("#financePending", ui.formatBRL(summary.pending));
    setText("#financeCancelled", summary.cancelledCount);
    setText("#financeCommissions", ui.formatBRL(summary.totalCommissions));
    setText("#financeNet", ui.formatBRL(summary.netEstimate));
  }

  // ------------------------------------------------------------- comissões
  function renderCommissionsSection() {
    const wrap = qs("#commissionsWrap");
    if (!wrap) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    wrap.innerHTML = db.getProfessionals().map((p) => {
      const s = db.getCommissionSummary(p.id, { dateFrom: monthStart, dateTo: monthEnd });
      return `<div class="panel">
        <div class="panel-head">
          <h3>${ui.escapeHtml(p.displayName)} <span class="text-muted" style="font-size:12px;">(${p.commissionPct}% de comissão)</span></h3>
          <button class="btn btn-primary btn-sm" data-register-payment="${p.id}">Registrar pagamento</button>
        </div>
        <div class="kpi-grid" style="margin-bottom:0;">
          <div class="kpi-card"><div class="label">Produzido (mês)</div><div class="value">${ui.formatBRL(s.totalProduced)}</div></div>
          <div class="kpi-card"><div class="label">Comissão devida</div><div class="value gold">${ui.formatBRL(s.commissionDue)}</div></div>
          <div class="kpi-card"><div class="label">Já pago</div><div class="value">${ui.formatBRL(s.amountPaid)}</div></div>
          <div class="kpi-card"><div class="label">Pendente</div><div class="value">${ui.formatBRL(s.amountPending)}</div></div>
        </div>
      </div>`;
    }).join("");

    qsa("[data-register-payment]", wrap).forEach((btn) => btn.addEventListener("click", () => openPaymentModal(btn.dataset.registerPayment, monthStart, monthEnd)));
  }

  function openPaymentModal(professionalId, defaultFrom, defaultTo) {
    const f = qs("#paymentForm");
    f.elements.professionalId.value = professionalId;
    f.elements.periodStart.value = defaultFrom;
    f.elements.periodEnd.value = defaultTo;
    f.elements.amountPaid.value = "";
    f.elements.method.value = "pix";
    f.elements.notes.value = "";
    ui.openModal("paymentModal");
  }

  function bindPaymentForm() {
    const f = qs("#paymentForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      db.registerEmployeePayment({
        professionalId: fd.get("professionalId"),
        periodStart: fd.get("periodStart"),
        periodEnd: fd.get("periodEnd"),
        amountPaid: Number(fd.get("amountPaid")),
        method: fd.get("method"),
        notes: fd.get("notes"),
      });
      ui.toast("Pagamento registrado.", "success");
      ui.closeModal("paymentModal");
      renderCommissionsSection();
    });
  }

  // ------------------------------------------------------------- config
  function renderSettingsSection() {
    const f = qs("#settingsForm");
    if (!f) return;
    const s = db.getSettings();
    f.elements.businessName.value = s.businessName;
    f.elements.street.value = s.address.street;
    f.elements.number.value = s.address.number;
    f.elements.neighborhood.value = s.address.neighborhood;
    f.elements.city.value = s.address.city;
    f.elements.state.value = s.address.state;
    f.elements.zip.value = s.address.zip;
    f.elements.whatsapp.value = s.whatsapp;
    f.elements.rating.value = s.rating;
    f.elements.reviewsCount.value = s.reviewsCount;

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      db.setSettings({
        businessName: fd.get("businessName"),
        address: {
          street: fd.get("street"), number: fd.get("number"), neighborhood: fd.get("neighborhood"),
          city: fd.get("city"), state: fd.get("state"), zip: fd.get("zip"),
        },
        whatsapp: fd.get("whatsapp"),
        rating: Number(fd.get("rating")),
        reviewsCount: Number(fd.get("reviewsCount")),
      });
      ui.toast("Configurações salvas.", "success");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#adminApp")) {
      init();
      bindServiceForm();
      bindBlockForm();
      bindPaymentForm();
    }
  });
})(window);
