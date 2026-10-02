/**
 * FINO DE GARAGEM — painel do cliente (pages/cliente.html)
 */
(function (global) {
  "use strict";
  const { db, ui, auth } = global.FDG;

  function qs(sel) { return document.querySelector(sel); }

  let user, client;

  function init() {
    user = auth.requireRole(["client"], "login.html");
    if (!user) return;
    client = db.getClientByUserId(user.id);

    renderGreeting();
    renderNextAppointment();
    renderBarberPass();
    renderHistory();
    renderProfile();
    bindTabs();
    bindProfileForm();
  }

  function renderGreeting() {
    qs("#greetingName") && (qs("#greetingName").textContent = user.name.split(" ")[0]);
    document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = user.name));
    document.querySelectorAll("[data-user-initials]").forEach((el) => (el.textContent = ui.initials(user.name)));
  }

  function getUpcoming() {
    const now = new Date();
    return db.getAppointments({ clientId: client.id })
      .filter((a) => ["PENDENTE", "CONFIRMADO", "EM_ATENDIMENTO"].includes(a.status))
      .filter((a) => new Date(a.date + "T" + a.endTime) >= now)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }

  function renderNextAppointment() {
    const wrap = qs("#nextAppointmentWrap");
    if (!wrap) return;
    const upcoming = getUpcoming();
    const next = upcoming[0];
    if (!next) {
      wrap.innerHTML = `
        <div class="next-appt-card">
          <span class="eyebrow">Seu próximo corte</span>
          <h3>Você ainda não possui um horário.</h3>
          <div class="actions"><a href="agendamento.html" class="btn btn-primary">Agendar agora</a></div>
        </div>`;
      return;
    }
    const service = db.getService(next.serviceId);
    const pro = db.getProfessional(next.professionalId);
    wrap.innerHTML = `
      <div class="next-appt-card">
        <span class="eyebrow">Seu próximo corte</span>
        <h3>${ui.escapeHtml(service.name)}</h3>
        <div class="meta-row">
          <div><span>Data</span><strong>${ui.formatDate(next.date)}</strong></div>
          <div><span>Horário</span><strong>${next.startTime}</strong></div>
          <div><span>Profissional</span><strong>${ui.escapeHtml(pro.displayName)}</strong></div>
          <div><span>Valor</span><strong>${ui.formatBRL(next.price)}</strong></div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" id="btnReschedule" data-id="${next.id}">Reagendar</button>
          <button class="btn btn-danger btn-sm" id="btnCancel" data-id="${next.id}">Cancelar</button>
          <a class="btn btn-whatsapp btn-sm" href="${ui.whatsappLink('Olá! Preciso falar sobre meu agendamento de ' + service.name + ' no dia ' + next.date + '.')}">Falar no WhatsApp</a>
        </div>
      </div>`;

    qs("#btnCancel")?.addEventListener("click", () => {
      if (!confirm("Deseja realmente cancelar este agendamento?")) return;
      db.cancelAppointment(next.id);
      ui.toast("Agendamento cancelado.", "success");
      renderNextAppointment();
      renderHistory();
    });
    qs("#btnReschedule")?.addEventListener("click", () => {
      location.href = `agendamento.html?service=${next.serviceId}`;
    });
  }

  function renderBarberPass() {
    const wrap = qs("#barberPassWrap");
    if (!wrap) return;
    const completed = db.getAppointments({ clientId: client.id, status: "CONCLUIDO" }).length;
    const goal = 10;
    const stamps = Array.from({ length: goal }, (_, i) => i < completed);
    wrap.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3>Barber Pass</h3>
          <span class="text-muted" style="font-size:13px;">${completed}/${goal} visitas</span>
        </div>
        <p class="text-muted" style="font-size:13px;margin-bottom:14px;">A cada ${goal} visitas concluídas, você desbloqueia um benefício exclusivo. (Arquitetura pronta para virar programa de fidelidade.)</p>
        <div class="pass-strip">
          ${stamps.map((done, i) => `<div class="pass-stamp ${done ? "done" : ""}">${(i + 1).toString().padStart(2, "0")}</div>`).join("")}
        </div>
      </div>`;
  }

  function renderHistory() {
    const wrap = qs("#historyWrap");
    if (!wrap) return;
    const all = db.getAppointments({ clientId: client.id }).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
    if (!all.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>Nenhum agendamento no histórico ainda.</p></div>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Data</th><th>Serviço</th><th>Profissional</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${all.map((a) => {
        const s = db.getService(a.serviceId);
        const p = db.getProfessional(a.professionalId);
        return `<tr><td>${ui.formatDate(a.date)} ${a.startTime}</td><td class="strong">${ui.escapeHtml(s.name)}</td><td>${ui.escapeHtml(p.displayName)}</td><td>${ui.formatBRL(a.price)}</td><td><span class="${ui.statusTagClass(a.status)}">${ui.statusLabel(a.status)}</span></td></tr>`;
      }).join("")}</tbody>
    </table></div>`;
  }

  function renderProfile() {
    const f = qs("#profileForm");
    if (!f) return;
    f.elements.name.value = user.name;
    f.elements.email.value = user.email;
    f.elements.phone.value = user.phone || "";
  }

  function bindProfileForm() {
    const f = qs("#profileForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      user.name = f.elements.name.value.trim();
      user.phone = f.elements.phone.value.trim();
      saveUserPatch();
      ui.toast("Perfil atualizado.", "success");
      renderGreeting();
    });
  }

  function saveUserPatch() {
    const raw = JSON.parse(localStorage.getItem("fdg_db_v1"));
    const idx = raw.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) raw.users[idx] = { ...raw.users[idx], name: user.name, phone: user.phone };
    localStorage.setItem("fdg_db_v1", JSON.stringify(raw));
  }

  function bindTabs() {
    const tabs = document.querySelectorAll("[data-tab-target]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        tabs.forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(`[data-tab-target="${tab.dataset.tabTarget}"]`).forEach((t) => t.classList.add("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hide"));
        document.getElementById(tab.dataset.tabTarget)?.classList.remove("hide");
        window.scrollTo({ top: 0 });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#clientApp")) init();
  });
})(window);
