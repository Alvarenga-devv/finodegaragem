/**
 * FINO DE GARAGEM — pagamento (pages/pagamento.html)
 *
 * IMPORTANTE: não há gateway real conectado neste protótipo. A tela está
 * estruturada para receber a integração (Mercado Pago ou outro gateway),
 * com os pontos exatos marcados como TODO_GATEWAY. Nenhum "pagamento
 * aprovado" é simulado como se fosse real — o status fica "aguardando"
 * até confirmação manual do administrador (ou webhook real em produção).
 */
(function (global) {
  "use strict";
  const { db, ui } = global.FDG;

  function qs(sel) { return document.querySelector(sel); }

  function init() {
    const params = new URLSearchParams(location.search);
    const apptId = params.get("appointment");
    const appt = db.getAppointment(apptId);
    if (!appt) { qs("#payRoot").innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Agendamento não encontrado.</p></div>`; return; }

    const service = db.getService(appt.serviceId);
    qs("#payServiceName").textContent = service.name;
    qs("#payAmount").textContent = ui.formatBRL(appt.price);

    if (appt.paymentMethod === "pix") renderPix(appt);
    else if (appt.paymentMethod === "cartao") renderCard(appt);
    else renderLocal(appt);

    qs("#goToConfirmation")?.addEventListener("click", () => {
      location.href = `confirmacao.html?appointment=${appt.id}`;
    });
  }

  function renderPix(appt) {
    qs("#pixSection").classList.remove("hide");
    // TODO_GATEWAY: substituir pelo QR Code e "copia e cola" reais retornados
    // pela API do gateway (ex.: Mercado Pago - Pix) ao criar a cobrança.
    qs("#pixCode").textContent = `00020126330014BR.GOV.BCB.PIX-DEMO-${appt.id}-${appt.price}5204000053039865802BR5920FINO DE GARAGEM6009IBIRITE62070503***6304ABCD`;

    let seconds = 15 * 60;
    const timerEl = qs("#pixTimer");
    const tick = () => {
      const m = Math.floor(seconds / 60).toString().padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
      if (seconds <= 0) { clearInterval(interval); timerEl.textContent = "Expirado"; }
      seconds--;
    };
    tick();
    const interval = setInterval(tick, 1000);

    qs("#copyPixBtn")?.addEventListener("click", () => {
      navigator.clipboard?.writeText(qs("#pixCode").textContent);
      ui.toast("Código Pix copiado.", "success");
    });

    // Em produção: o status muda via webhook do gateway (server-side),
    // nunca confiando apenas na ação do cliente no navegador.
    qs("#simulateCheckStatus")?.addEventListener("click", () => {
      ui.toast("Aguardando confirmação do pagamento. O status será atualizado automaticamente quando o gateway confirmar.", "default");
    });
  }

  function renderCard(appt) {
    qs("#cardSection").classList.remove("hide");
    // TODO_GATEWAY: embutir Checkout Transparente / Checkout Pro do gateway
    // escolhido. Nenhum dado de cartão deve ser processado ou armazenado
    // diretamente por este front-end.
  }

  function renderLocal(appt) {
    qs("#localSection").classList.remove("hide");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#payRoot")) init();
  });
})(window);
