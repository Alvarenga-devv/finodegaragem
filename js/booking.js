/**
 * FINO DE GARAGEM — fluxo de agendamento (pages/agendamento.html)
 */
(function (global) {
  "use strict";
  const { db, ui, auth } = global.FDG;

  const state = { step: 1, serviceId: null, professionalId: null, date: null, time: null, paymentMethod: "local" };

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get("service")) state.serviceId = params.get("service");

    renderServices();
    renderProfessionals();
    bindNav();
    goToStep(state.serviceId ? 2 : 1);
    renderStepper();
  }

  function renderStepper() {
    qsa(".step").forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle("active", n === state.step);
      el.classList.toggle("done", n < state.step);
    });
  }

  function goToStep(n) {
    state.step = n;
    qsa(".booking-step").forEach((el) => el.classList.toggle("hide", Number(el.dataset.step) !== n));
    renderStepper();
    if (n === 3) renderCalendar();
    if (n === 4) renderSlots();
    if (n === 5) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderServices() {
    const wrap = qs("#serviceOptions");
    if (!wrap) return;
    const services = db.getServices();
    wrap.innerHTML = services.map((s) => `
      <div class="option-card ${s.id === state.serviceId ? "selected" : ""}" data-id="${s.id}" tabindex="0" role="button" aria-pressed="${s.id === state.serviceId}">
        <h4>${ui.escapeHtml(s.name)}</h4>
        <div class="price">${s.price !== null ? ui.formatBRL(s.price) : "Consultar"}</div>
        <div class="small">${s.duration} min</div>
      </div>
    `).join("");
    wrap.querySelectorAll(".option-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.serviceId = card.dataset.id;
        qsa("#serviceOptions .option-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        qs("#toStep2").disabled = false;
      });
    });
    if (state.serviceId) { const el = wrap.querySelector(`[data-id="${state.serviceId}"]`); el?.classList.add("selected"); }
  }

  function renderProfessionals() {
    const wrap = qs("#professionalOptions");
    if (!wrap) return;
    const pros = db.getProfessionals();
    wrap.innerHTML = pros.map((p) => `
      <div class="option-card ${p.id === state.professionalId ? "selected" : ""}" data-id="${p.id}" tabindex="0" role="button">
        <h4>${ui.escapeHtml(p.displayName)}</h4>
        <div class="small">${ui.escapeHtml(p.role)}</div>
      </div>
    `).join("");
    wrap.querySelectorAll(".option-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.professionalId = card.dataset.id;
        qsa("#professionalOptions .option-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        qs("#toStep3").disabled = false;
      });
    });
  }

  function renderCalendar() {
    const wrap = qs("#dateOptions");
    if (!wrap) return;
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      days.push(d);
    }
    wrap.innerHTML = days.map((d) => {
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      const hours = db.getBusinessHours()[dow];
      const closed = !hours || !hours.open;
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      return `<div class="option-card ${closed ? "" : ""} ${state.date === iso ? "selected" : ""}" data-date="${iso}" data-closed="${closed}" style="${closed ? "opacity:.35;cursor:not-allowed;" : ""}">
        <h4>${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}</h4>
        <div class="small">${closed ? "Fechado" : label}</div>
      </div>`;
    }).join("");
    wrap.querySelectorAll(".option-card").forEach((card) => {
      if (card.dataset.closed === "true") return;
      card.addEventListener("click", () => {
        state.date = card.dataset.date;
        state.time = null;
        qsa("#dateOptions .option-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        qs("#toStep4").disabled = false;
      });
    });
  }

  function renderSlots() {
    const wrap = qs("#slotOptions");
    const empty = qs("#slotsEmpty");
    if (!wrap) return;
    const service = db.getService(state.serviceId);
    const slots = db.getAvailableSlots(state.professionalId, state.date, service.duration);
    if (!slots.length) {
      wrap.innerHTML = "";
      empty?.classList.remove("hide");
      qs("#toStep5").disabled = true;
      return;
    }
    empty?.classList.add("hide");
    wrap.innerHTML = slots.map((t) => `<button type="button" class="slot-btn ${state.time === t ? "selected" : ""}" data-time="${t}">${t}</button>`).join("");
    wrap.querySelectorAll(".slot-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.time = btn.dataset.time;
        wrap.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        qs("#toStep5").disabled = false;
      });
    });
  }

  function renderSummary() {
    const service = db.getService(state.serviceId);
    const pro = db.getProfessional(state.professionalId);
    qs("#summaryService").textContent = service.name;
    qs("#summaryProfessional").textContent = pro.displayName;
    qs("#summaryDate").textContent = ui.formatDate(state.date);
    qs("#summaryTime").textContent = state.time;
    qs("#summaryPrice").textContent = service.price !== null ? ui.formatBRL(service.price) : "Consultar";
  }

  function bindNav() {
    qs("#toStep2")?.addEventListener("click", () => goToStep(2));
    qs("#toStep3")?.addEventListener("click", () => goToStep(3));
    qs("#toStep4")?.addEventListener("click", () => goToStep(4));
    qs("#toStep5")?.addEventListener("click", () => goToStep(5));
    qs("#backStep1")?.addEventListener("click", () => goToStep(1));
    qs("#backStep2")?.addEventListener("click", () => goToStep(2));
    qs("#backStep3")?.addEventListener("click", () => goToStep(3));
    qs("#backStep4")?.addEventListener("click", () => goToStep(4));

    qsa('input[name="paymentMethod"]').forEach((r) => r.addEventListener("change", (e) => { state.paymentMethod = e.target.value; }));

    qs("#confirmBooking")?.addEventListener("click", onConfirm);
  }

  function onConfirm() {
    const user = auth.currentUser();
    if (!user || user.role !== "client") {
      sessionStorage.setItem("fdg_pending_booking", JSON.stringify(state));
      ui.toast("Faça login ou crie sua conta para confirmar o agendamento.", "error");
      location.href = `login.html?redirect=agendamento.html`;
      return;
    }
    const client = db.getClientByUserId(user.id);
    const result = db.createAppointment({
      clientId: client.id,
      professionalId: state.professionalId,
      serviceId: state.serviceId,
      date: state.date,
      startTime: state.time,
      paymentMethod: state.paymentMethod,
    });
    if (!result.ok) {
      ui.toast(result.error, "error");
      renderSlots();
      return;
    }
    sessionStorage.setItem("fdg_last_appointment", result.appointment.id);
    if (state.paymentMethod !== "local") {
      location.href = `pagamento.html?appointment=${result.appointment.id}`;
    } else {
      location.href = `confirmacao.html?appointment=${result.appointment.id}`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#serviceOptions")) init();
  });

  global.FDG.booking = { state };
})(window);
