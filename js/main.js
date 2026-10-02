/**
 * FINO DE GARAGEM — utilidades compartilhadas (toast, modal, formatação, nav mobile)
 */
(function (global) {
  "use strict";

  function formatBRL(value) {
    if (value === null || value === undefined) return "Consultar";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  function formatDateLong(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  }

  function statusLabel(status) {
    const map = {
      PENDENTE: "Pendente", CONFIRMADO: "Confirmado", EM_ATENDIMENTO: "Em atendimento",
      CONCLUIDO: "Concluído", CANCELADO: "Cancelado", NO_SHOW: "Não compareceu",
    };
    return map[status] || status;
  }

  function statusTagClass(status) {
    return "tag tag-" + status.toLowerCase();
  }

  // -------- Toasts --------
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }
  function toast(message, type = "default") {
    const stack = ensureToastStack();
    const el = document.createElement("div");
    el.className = "toast " + (type === "default" ? "" : type);
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .3s"; el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }

  // -------- Modal --------
  function openModal(id) {
    document.getElementById(id)?.classList.add("show");
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove("show");
  }
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) e.target.classList.remove("show");
    if (e.target.closest("[data-close-modal]")) {
      const id = e.target.closest("[data-close-modal]").dataset.closeModal;
      closeModal(id);
    }
  });

  // -------- WhatsApp --------
  function whatsappLink(message) {
    const settings = global.FDG.db.getSettings();
    const phone = settings.whatsapp;
    const text = encodeURIComponent(message || "Olá! Gostaria de falar com a Barbearia Fino de Garagem.");
    return `https://wa.me/${phone}?text=${text}`;
  }

  // -------- Mobile nav --------
  function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      nav.classList.toggle("mobile-open");
      toggle.classList.toggle("open");
    });
  }

  function initSidebarToggle() {
    const toggle = document.querySelector(".mobile-topbar .sidebar-toggle");
    const sidebar = document.querySelector(".app-sidebar");
    if (!toggle || !sidebar) return;
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }

  function initWhatsappFloat() {
    const btn = document.querySelector(".whatsapp-float");
    if (btn) btn.href = whatsappLink();
  }

  function initials(name) {
    if (!name) return "?";
    return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  global.FDG = global.FDG || {};
  global.FDG.ui = {
    formatBRL, formatDate, formatDateLong, statusLabel, statusTagClass,
    toast, openModal, closeModal, whatsappLink, initMobileNav, initSidebarToggle, initWhatsappFloat,
    initials, escapeHtml,
  };

  document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
    initSidebarToggle();
    initWhatsappFloat();
  });
})(window);
