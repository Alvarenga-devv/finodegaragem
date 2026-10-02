/**
 * FINO DE GARAGEM — painel do barbeiro (pages/barbeiro.html)
 * Acesso: role "barber" (e "admin", que também atende clientes).
 */
(function (global) {
  "use strict";
  const { db, ui, auth, agenda } = global.FDG;

  function qs(sel) { return document.querySelector(sel); }
  let user, professional, viewDate = new Date();

  function init() {
    user = auth.requireRole(["barber", "admin"], "login.html");
    if (!user) return;
    professional = db.getProfessionals().find((p) => p.userId === user.id);
    if (!professional) { qs("#barberApp").innerHTML = `<p>Perfil de profissional não encontrado.</p>`; return; }

    document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = user.name));
    document.querySelectorAll("[data-user-initials]").forEach((el) => (el.textContent = ui.initials(user.name)));

    renderToday();
    renderAgenda();
    renderAppointmentsList();
    renderEarnings();
    bindDateNav();
    bindBlockModal();
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function renderToday() {
    const today = todayISO();
    const appts = db.getAppointments({ professionalId: professional.id, date: today });
    const concluded = appts.filter((a) => a.status === "CONCLUIDO");
    const revenue = concluded.reduce((s, a) => s + (a.price || 0), 0);
    const upcoming = appts.filter((a) => ["PENDENTE", "CONFIRMADO"].includes(a.status)).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    const slotsLeft = db.getAvailableSlots(professional.id, today, 30).length;

    setText("#kpiTodayCount", appts.length);
    setText("#kpiTodayDone", concluded.length);
    setText("#kpiTodayRevenue", ui.formatBRL(revenue));
    setText("#kpiTodayNext", upcoming ? `${upcoming.startTime} · ${db.getClient(upcoming.clientId) ? db.getUser(db.getClient(upcoming.clientId).userId).name : "Cliente"}` : "—");
    setText("#kpiTodaySlots", slotsLeft);
  }

  function setText(sel, val) { const el = qs(sel); if (el) el.textContent = val; }

  function bindDateNav() {
    qs("#agendaPrev")?.addEventListener("click", () => { viewDate.setDate(viewDate.getDate() - 1); renderAgenda(); });
    qs("#agendaNext")?.addEventListener("click", () => { viewDate.setDate(viewDate.getDate() + 1); renderAgenda(); });
    qs("#agendaToday")?.addEventListener("click", () => { viewDate = new Date(); renderAgenda(); });
  }

  function renderAgenda() {
    const label = qs("#agendaDateLabel");
    if (label) label.textContent = ui.formatDateLong(agenda.dateToISO(viewDate));
    const container = qs("#agendaContainer");
    if (!container) return;
    agenda.renderDayAgenda(container, {
      professionalId: professional.id,
      date: agenda.dateToISO(viewDate),
      onStatusChange: openStatusModal,
    });
  }

  function openStatusModal(apptId) {
    const appt = db.getAppointment(apptId);
    if (!appt) return;
    const service = db.getService(appt.serviceId);
    const client = db.getClient(appt.clientId);
    const clientUser = client ? db.getUser(client.userId) : null;
    qs("#statusModalBody").innerHTML = `
      <p><strong>${ui.escapeHtml(clientUser?.name || "Cliente")}</strong> — ${ui.escapeHtml(service.name)}</p>
      <p class="text-muted">${ui.formatDate(appt.date)} às ${appt.startTime} · ${ui.formatBRL(appt.price)}</p>
      <div class="field">
        <label>Status do atendimento</label>
        <select id="statusSelect">
          ${["PENDENTE", "CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "NO_SHOW"].map((s) => `<option value="${s}" ${s === appt.status ? "selected" : ""}>${ui.statusLabel(s)}</option>`).join("")}
        </select>
      </div>`;
    qs("#saveStatusBtn").onclick = () => {
      const newStatus = qs("#statusSelect").value;
      db.updateAppointmentStatus(apptId, newStatus);
      ui.toast("Status atualizado.", "success");
      ui.closeModal("statusModal");
      renderAgenda(); renderToday(); renderAppointmentsList(); renderEarnings();
    };
    ui.openModal("statusModal");
  }

  function renderAppointmentsList() {
    const wrap = qs("#appointmentsListWrap");
    if (!wrap) return;
    const appts = db.getAppointments({ professionalId: professional.id }).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 40);
    if (!appts.length) { wrap.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>Nenhum agendamento ainda.</p></div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${appts.map((a) => {
        const service = db.getService(a.serviceId);
        const client = db.getClient(a.clientId);
        const clientUser = client ? db.getUser(client.userId) : null;
        return `<tr><td>${ui.formatDate(a.date)} ${a.startTime}</td><td class="strong">${ui.escapeHtml(clientUser?.name || "—")}</td><td>${ui.escapeHtml(service.name)}</td><td>${ui.formatBRL(a.price)}</td><td><span class="${ui.statusTagClass(a.status)}">${ui.statusLabel(a.status)}</span></td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  }

  function renderEarnings() {
    const wrap = qs("#earningsWrap");
    if (!wrap) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const summary = db.getCommissionSummary(professional.id, { dateFrom: monthStart, dateTo: monthEnd });

    wrap.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="label">Atendimentos (mês)</div><div class="value">${summary.appointmentCount}</div></div>
        <div class="kpi-card"><div class="label">Valor produzido</div><div class="value">${ui.formatBRL(summary.totalProduced)}</div></div>
        <div class="kpi-card"><div class="label">Comissão (${summary.commissionPct}%)</div><div class="value gold">${ui.formatBRL(summary.commissionDue)}</div></div>
        <div class="kpi-card"><div class="label">Pendente</div><div class="value">${ui.formatBRL(summary.amountPending)}</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Histórico de pagamentos recebidos</h3></div>
        ${renderPaymentHistory()}
      </div>`;
  }

  function renderPaymentHistory() {
    const payments = db.getEmployeePayments(professional.id);
    if (!payments.length) return `<div class="empty-state"><div class="icon">💸</div><p>Nenhum pagamento registrado ainda pelo administrador.</p></div>`;
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Data</th><th>Período</th><th>Valor</th><th>Método</th></tr></thead>
      <tbody>${payments.map((p) => `<tr><td>${ui.formatDate(p.date.slice(0, 10))}</td><td>${ui.formatDate(p.periodStart)} a ${ui.formatDate(p.periodEnd)}</td><td class="strong">${ui.formatBRL(p.amountPaid)}</td><td>${ui.escapeHtml(p.method)}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }

  function bindBlockModal() {
    qs("#openBlockModal")?.addEventListener("click", () => ui.openModal("blockModal"));
    const form = qs("#blockForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const fullDay = fd.get("fullDay") === "on";
      db.addBlockedTime({
        professionalId: professional.id,
        date: fd.get("date"),
        startTime: fullDay ? "00:00" : fd.get("startTime"),
        endTime: fullDay ? "23:59" : fd.get("endTime"),
        reason: fd.get("reason"),
        fullDay,
      });
      ui.toast("Horário bloqueado com sucesso.", "success");
      ui.closeModal("blockModal");
      form.reset();
      renderAgenda(); renderToday();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#barberApp")) init();
  });
})(window);
