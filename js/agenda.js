/**
 * FINO DE GARAGEM — agenda visual (reutilizado por barbeiro.html e admin.html)
 */
(function (global) {
  "use strict";
  const { db, ui } = global.FDG;

  function qs(sel, root = document) { return root.querySelector(sel); }

  function dateToISO(d) { return d.toISOString().slice(0, 10); }

  function buildDayTimeline(professionalId, dateISO) {
    const dow = new Date(dateISO + "T00:00:00").getDay();
    const hours = db.getBusinessHours()[dow];
    const appts = db.getAppointments({ professionalId, date: dateISO }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const blocks = db.getBlockedTimes({ professionalId, date: dateISO });

    if (!hours || !hours.open) return { closed: true, items: [] };

    const items = [];
    appts.forEach((a) => {
      const service = db.getService(a.serviceId);
      const client = db.getClient(a.clientId);
      const clientUser = client ? db.getUser(client.userId) : null;
      items.push({
        type: "appointment", time: a.startTime, endTime: a.endTime, status: a.status,
        title: clientUser?.name || "Cliente", subtitle: `${service?.name || ""} · ${ui.formatBRL(a.price)}`,
        appointment: a,
      });
    });
    blocks.forEach((b) => {
      items.push({
        type: "block", time: b.fullDay ? "00:00" : b.startTime, endTime: b.fullDay ? "23:59" : b.endTime,
        status: "cancelado", title: b.fullDay ? "Dia bloqueado" : "Horário bloqueado", subtitle: b.reason, block: b,
      });
    });
    items.sort((a, b) => a.time.localeCompare(b.time));
    return { closed: false, items, hours };
  }

  function renderDayAgenda(container, { professionalId, date, onStatusChange }) {
    const { closed, items } = buildDayTimeline(professionalId, date);
    if (closed) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🚪</div><p>Barbearia fechada neste dia.</p></div>`;
      return;
    }
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🗓️</div><p>Nenhum agendamento ou bloqueio para este dia.</p></div>`;
      return;
    }
    container.innerHTML = `<div class="agenda-day">${items.map((it) => `
      <div class="agenda-slot">
        <div class="agenda-time">${it.time}</div>
        <div class="agenda-block status-${it.status.toLowerCase()}" data-appt-id="${it.appointment ? it.appointment.id : ""}">
          <div>
            <strong>${ui.escapeHtml(it.title)}</strong>
            <small>${ui.escapeHtml(it.subtitle || "")}</small>
          </div>
          <span class="${ui.statusTagClass(it.status)}">${it.type === "block" ? "Bloqueado" : ui.statusLabel(it.status)}</span>
        </div>
      </div>
    `).join("")}</div>`;

    if (onStatusChange) {
      container.querySelectorAll(".agenda-block[data-appt-id]").forEach((el) => {
        const id = el.dataset.apptId;
        if (!id) return;
        el.style.cursor = "pointer";
        el.addEventListener("click", () => onStatusChange(id));
      });
    }
  }

  function renderWeekAgenda(container, { professionalId, startDate }) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      days.push(d);
    }
    container.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
      ${days.map((d) => `<th>${d.toLocaleDateString("pt-BR", { weekday: "short" })}<br>${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}</th>`).join("")}
    </tr></thead><tbody><tr>
      ${days.map((d) => {
        const iso = dateToISO(d);
        const { closed, items } = buildDayTimeline(professionalId, iso);
        if (closed) return `<td style="color:var(--muted)">Fechado</td>`;
        if (!items.length) return `<td style="color:var(--muted)">—</td>`;
        return `<td>${items.map((it) => `<div style="margin-bottom:6px;"><span class="${ui.statusTagClass(it.status)}">${it.time}</span><br><small>${ui.escapeHtml(it.title)}</small></div>`).join("")}</td>`;
      }).join("")}
    </tr></tbody></table></div>`;
  }

  function renderMonthAgenda(container, { professionalId, year, month }) {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
      ${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => `<div style="text-align:center;font-size:11px;color:var(--muted);text-transform:uppercase;">${d}</div>`).join("")}
      ${cells.map((d) => {
        if (!d) return `<div></div>`;
        const iso = dateToISO(d);
        const { closed, items } = buildDayTimeline(professionalId, iso);
        const count = items.filter((i) => i.type === "appointment").length;
        return `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;min-height:64px;background:var(--charcoal);${closed ? "opacity:.4;" : ""}">
          <div style="font-size:12px;color:var(--bone-dim);">${d.getDate()}</div>
          ${count ? `<div style="margin-top:6px;"><span class="tag tag-confirmado">${count} agend.</span></div>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  global.FDG.agenda = { renderDayAgenda, renderWeekAgenda, renderMonthAgenda, dateToISO };
})(window);
